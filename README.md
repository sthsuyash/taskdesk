# rrweb Starter Kit

A complete, production-ready foundation for session replay, live co-browsing,
and user behavior tracking — built on [rrweb](https://www.rrweb.io/).

---

## What's included

```
rrweb-starter/
├── server/
│   └── index.js          # Express + WebSocket server
├── public/
│   ├── recorder/
│   │   ├── recorder.js   # Drop-in recorder snippet (goes on your site)
│   │   └── index.html    # Demo page to test recording
│   ├── player/
│   │   └── index.html    # Full replay + live view page
│   └── dashboard/
│       └── index.html    # Session list + stats dashboard
└── package.json
```

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
# or for auto-reload during development:
npm run dev

# 3. Open the demo page and interact
open http://localhost:3000/recorder/

# 4. Watch your session appear in the dashboard
open http://localhost:3000/dashboard/
```

---

## How to add recording to YOUR site

Add **one line** to any page you want to track:

```html
<script src="http://localhost:3000/recorder/recorder.js"></script>
```

That's it. The snippet:
- Creates a session ID automatically (stored in sessionStorage)
- Records DOM changes, clicks, scrolls, inputs
- Batches and sends events to the server every 3 seconds
- Masks passwords automatically
- Flushes on page close via sendBeacon

### Using npm instead of CDN

```bash
npm install @rrweb/record
```

```js
import { record } from '@rrweb/record';

const SESSION_ID = 'your-session-id'; // get from your backend
const events = [];

const stop = record({
  emit(event) {
    events.push(event);
    if (events.length >= 50) flush(); // batch of 50
  },
  maskInputOptions: { password: true, tel: true },
  sampling: { mousemove: 50, scroll: 150 },
});

async function flush() {
  const batch = events.splice(0, events.length);
  await fetch(`/api/sessions/${SESSION_ID}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: batch }),
  });
}
```

---

## Privacy controls

### Block an element entirely (shown as gray box in replay)
```html
<div class="rr-block">Credit card form</div>
```

### Mask text content (shown as ***** in replay)
```html
<span class="rr-mask">Sensitive text</span>
```

### Ignore input events on an element
```html
<input class="rr-ignore" type="text">
```

### Mask all inputs of certain types (in recorder config)
```js
record({
  maskInputOptions: {
    password: true,  // always do this
    email: true,
    tel: true,
    text: false,
  },
});
```

### Block by CSS selector
```js
record({
  blockSelector: '[data-private], .payment-info, #ssn-field',
});
```

---

## Custom event tracking

Track business events alongside DOM events. They appear as markers on the
replay timeline.

```js
// Track any business event
window.rrwebTrack('product_viewed', { productId: 'abc', price: 99 });
window.rrwebTrack('checkout_started', { cartTotal: 149 });
window.rrwebTrack('form_abandoned', { field: 'address' });

// During replay, these appear in the custom events sidebar
// and as markers on the scrubber timeline
```

---

## Live mode / co-browsing

Live mode streams events in real time over WebSocket. A support agent sees
exactly what the user sees, live, with <1 second delay.

**Step 1:** Enable WebSocket mode in recorder.js:
```js
const USE_WEBSOCKET = true; // was false
```

**Step 2:** Open the live view URL:
```
http://localhost:3000/player/?session=<SESSION_ID>&live=true
```

The player connects via WebSocket, receives a "catchup" snapshot of existing
events, then streams incremental events as they arrive.

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Create new session, returns `{ sessionId }` |
| POST | `/api/sessions/:id/events` | Append events `{ events: [...] }` |
| GET  | `/api/sessions` | List all sessions |
| GET  | `/api/sessions/:id/events` | Fetch all events for replay |
| DELETE | `/api/sessions/:id` | Delete a session |
| WS   | `/live?session=<id>&role=viewer` | Subscribe to live events |
| WS   | `/live?session=<id>&role=recorder` | Push events via WebSocket |

---

## Moving to production

### 1. Replace in-memory store with PostgreSQL

```js
// In server/index.js, replace the sessions Map with:

import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Schema:
// CREATE TABLE sessions (id UUID PRIMARY KEY, url TEXT, started_at TIMESTAMPTZ, metadata JSONB);
// CREATE TABLE session_events (id BIGSERIAL, session_id UUID, events JSONB, created_at TIMESTAMPTZ);

// Store events:
await pool.query(
  'INSERT INTO session_events (session_id, events) VALUES ($1, $2)',
  [sessionId, JSON.stringify(events)]
);

// Fetch events:
const rows = await pool.query(
  'SELECT events FROM session_events WHERE session_id = $1 ORDER BY id',
  [sessionId]
);
const allEvents = rows.rows.flatMap(r => r.events);
```

### 2. Use S3 for large sessions

```js
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Store as gzipped JSON
await s3.send(new PutObjectCommand({
  Bucket: 'my-rrweb-sessions',
  Key: `sessions/${sessionId}.json.gz`,
  Body: gzip(JSON.stringify(events)),
  ContentEncoding: 'gzip',
  ContentType: 'application/json',
}));
```

### 3. Sample only a % of sessions

Already built into recorder.js — set `SAMPLE_RATE`:
```js
const SAMPLE_RATE = 0.1; // record 10% of visitors
```

### 4. Force-record on errors

Already built in — any `window.onerror` event triggers an immediate flush.
You can also force recording for specific users:
```js
// In your app, after you know the user is important:
sessionStorage.setItem('rrweb_record', '1');
// Then reload the recorder snippet
```

---

## Event type reference

| Type | Name | What it means |
|------|------|---------------|
| 0 | DomContentLoaded | Page DOM ready |
| 1 | Load | All resources loaded |
| 2 | FullSnapshot | Complete DOM serialization (the "keyframe") |
| 3 | IncrementalSnapshot | A change: mutation / scroll / click / input / style |
| 4 | Meta | URL + viewport size |
| 5 | Custom | Your business events via rrwebTrack() |
| 6 | Plugin | Console/network plugin events |

IncrementalSnapshot sources:
- 1 = MouseMove
- 2 = MouseInteraction (click, dblclick, focus, blur, etc.)
- 3 = Scroll
- 4 = ViewportResize
- 5 = Input
- 6 = TouchMove
- 7 = MediaInteraction
- 8 = StyleSheetRule
- 9 = CanvasMutation
- 10 = Font
- 12 = StyleDeclaration

---

## Troubleshooting

**Sessions not appearing in dashboard**
- Check browser console for CORS or fetch errors
- Make sure the server is running on port 3000
- Check the Network tab in DevTools for /api/sessions/*/events requests

**Replay looks broken / missing styles**
- The page uses external CSS — replay loads it over the network
- If your site has CSP headers, the replay iframe may be blocked

**Live mode not connecting**
- Ensure you're not behind a proxy that drops WebSocket upgrades
- Check ws:// vs wss:// — use wss:// in production (HTTPS)

**Password showing in replay**
- Make sure `maskInputOptions: { password: true }` is set
- Check that the input type is actually `type="password"`
