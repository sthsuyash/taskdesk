/**
 * rrweb Starter — Server
 *
 * Handles:
 *  POST /api/sessions/:id/events   — receive batched events from recorder
 *  GET  /api/sessions              — list all sessions
 *  GET  /api/sessions/:id/events   — fetch events for replay
 *  DELETE /api/sessions/:id        — delete a session
 *  WS   /live?session=<id>         — real-time co-browsing / live mode
 *
 * Storage: SQLite (data/rrweb.db)
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import compression from 'compression';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '20mb' }));  // allow large batches
app.use(express.static(path.join(__dirname, '../public')));

// ─── SQLite Setup ────────────────────────────────────────────────────────────
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'rrweb.db'));

// Enable WAL mode for better concurrent read/write performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    url TEXT DEFAULT 'unknown',
    user_agent TEXT DEFAULT '',
    started_at INTEGER NOT NULL,
    last_event_at INTEGER NOT NULL,
    event_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS session_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    events TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_session_events_session_id
    ON session_events(session_id);
`);

// ─── Prepared Statements (much faster than inline SQL) ───────────────────────
const stmts = {
  insertSession: db.prepare(`
    INSERT OR IGNORE INTO sessions (id, url, user_agent, started_at, last_event_at, event_count)
    VALUES (?, ?, ?, ?, ?, 0)
  `),

  getSession: db.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `),

  updateSession: db.prepare(`
    UPDATE sessions
    SET last_event_at = ?, event_count = event_count + ?
    WHERE id = ?
  `),

  insertEvents: db.prepare(`
    INSERT INTO session_events (session_id, events, created_at)
    VALUES (?, ?, ?)
  `),

  getEvents: db.prepare(`
    SELECT events FROM session_events
    WHERE session_id = ?
    ORDER BY id ASC
  `),

  listSessions: db.prepare(`
    SELECT id, url, user_agent, started_at, last_event_at, event_count
    FROM sessions
    ORDER BY started_at DESC
  `),

  deleteSession: db.prepare(`
    DELETE FROM sessions WHERE id = ?
  `),

  deleteSessionEvents: db.prepare(`
    DELETE FROM session_events WHERE session_id = ?
  `),
};

// ─── Helper ──────────────────────────────────────────────────────────────────
function ensureSession(id, meta = {}) {
  const now = Date.now();
  stmts.insertSession.run(id, meta.url || 'unknown', meta.userAgent || '', now, now);
  return stmts.getSession.get(id);
}

// Batch insert: store events + update session in a single transaction
const addEvents = db.transaction((sessionId, events) => {
  const now = Date.now();
  ensureSession(sessionId);
  stmts.insertEvents.run(sessionId, JSON.stringify(events), now);
  stmts.updateSession.run(now, events.length, sessionId);
});

// ─── REST API ─────────────────────────────────────────────────────────────────

// Create a new session ID (called by recorder on page load)
app.post('/api/sessions', (req, res) => {
  const id = uuidv4();
  ensureSession(id, {
    url: req.body.url,
    userAgent: req.body.userAgent,
  });
  res.json({ sessionId: id });
});

// Receive batched events from the recorder
app.post('/api/sessions/:id/events', (req, res) => {
  const { id } = req.params;
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events must be a non-empty array' });
  }

  addEvents(id, events);
  const session = stmts.getSession.get(id);

  // Broadcast to any live viewers of this session
  broadcastToViewers(id, events);

  res.json({ ok: true, received: events.length, total: session.event_count });
});

// List all sessions (for the dashboard)
app.get('/api/sessions', (req, res) => {
  const rows = stmts.listSessions.all();
  const list = rows.map(s => ({
    id: s.id,
    url: s.url,
    userAgent: s.user_agent,
    startedAt: s.started_at,
    lastEventAt: s.last_event_at,
    eventCount: s.event_count,
    durationMs: s.last_event_at - s.started_at,
  }));
  res.json({ sessions: list });
});

// Fetch all events for a session (for async replay)
app.get('/api/sessions/:id/events', (req, res) => {
  const session = stmts.getSession.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Fetch all event batches and flatten into a single array
  const rows = stmts.getEvents.all(req.params.id);
  const events = rows.flatMap(row => JSON.parse(row.events));

  res.json({ events });
});

// Delete a session
app.delete('/api/sessions/:id', (req, res) => {
  stmts.deleteSessionEvents.run(req.params.id);
  stmts.deleteSession.run(req.params.id);
  res.json({ ok: true });
});

// ─── WebSocket — Live Mode ────────────────────────────────────────────────────
// Rooms map: sessionId → Set<WebSocket viewers>
// (kept in-memory — live connections are inherently ephemeral)
const rooms = new Map();

function broadcastToViewers(sessionId, events) {
  const viewers = rooms.get(sessionId);
  if (!viewers || viewers.size === 0) return;
  const payload = JSON.stringify({ type: 'events', events });
  viewers.forEach(ws => {
    if (ws.readyState === 1) ws.send(payload);
  });
}

const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'ws://localhost');
  const sessionId = url.searchParams.get('session');
  const role = url.searchParams.get('role') || 'viewer'; // 'recorder' | 'viewer'

  if (!sessionId) {
    ws.close(1008, 'Missing session param');
    return;
  }

  // Register viewer
  if (role === 'viewer') {
    if (!rooms.has(sessionId)) rooms.set(sessionId, new Set());
    rooms.get(sessionId).add(ws);

    // Send existing events so viewer can catch up (from DB)
    const rows = stmts.getEvents.all(sessionId);
    const events = rows.flatMap(row => JSON.parse(row.events));
    if (events.length > 0) {
      ws.send(JSON.stringify({ type: 'catchup', events }));
    }

    ws.on('close', () => {
      rooms.get(sessionId)?.delete(ws);
    });
  }

  // Recorder can also use WS to push events in real time
  if (role === 'recorder') {
    ws.on('message', (data) => {
      try {
        const { events } = JSON.parse(data.toString());
        addEvents(sessionId, events);
        broadcastToViewers(sessionId, events);
      } catch (e) {
        console.error('WS parse error:', e.message);
      }
    });
  }
});

// ─── Graceful shutdown ───────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\nShutting down — closing database...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  rrweb starter running on http://localhost:${PORT}
  Storage: SQLite → data/rrweb.db

  Pages:
    Recorder demo  → http://localhost:${PORT}/recorder/
    Session list   → http://localhost:${PORT}/dashboard/
    Player         → http://localhost:${PORT}/player/?session=<id>
    Live view      → http://localhost:${PORT}/player/?session=<id>&live=true
  `);
});
