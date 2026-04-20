/**
 * rrweb Recorder Snippet
 * ──────────────────────
 * Drop this into ANY page you want to record.
 * It handles:
 *   - Session ID creation (per browser tab, stored in sessionStorage)
 *   - Batched event sending every FLUSH_INTERVAL ms
 *   - Privacy: password inputs masked, .rr-block / .rr-mask classes supported
 *   - Sampling: records SAMPLE_RATE % of sessions (set to 1.0 during dev)
 *   - Custom events: window.rrwebTrack('event_name', { ...payload })
 *   - Error-triggered forced recording
 *   - Flush on page unload (sendBeacon)
 */

(function () {
  // ── Config ─────────────────────────────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  const runtimeCfg = window.__RRWEB_CONFIG || {};

  const SERVER_URL = (
    runtimeCfg.serverUrl ||
    params.get('server') ||
    localStorage.getItem('rrweb_server_url') ||
    `${location.protocol}//${location.host}`
  ).replace(/\/$/, '');

  const FLUSH_INTERVAL = Number(runtimeCfg.flushIntervalMs || params.get('flushMs') || localStorage.getItem('rrweb_flush_ms') || 3000);
  const rawSampleRate = Number(runtimeCfg.sampleRate || params.get('sampleRate') || localStorage.getItem('rrweb_sample_rate') || 1.0);
  const SAMPLE_RATE = Number.isFinite(rawSampleRate)
    ? Math.min(1, Math.max(0, rawSampleRate))
    : 1.0;

  const transportSetting = String(
    runtimeCfg.transport ||
    params.get('transport') ||
    localStorage.getItem('rrweb_transport') ||
    (params.get('live') === '1' ? 'ws' : 'http')
  ).toLowerCase();

  let useWebSocket = transportSetting === 'ws';

  // ── Sampling gate ──────────────────────────────────────────────────────────
  // Store decision in sessionStorage so it's consistent within the tab
  let shouldRecord = sessionStorage.getItem('rrweb_record');
  if (shouldRecord === null) {
    shouldRecord = Math.random() < SAMPLE_RATE ? '1' : '0';
    sessionStorage.setItem('rrweb_record', shouldRecord);
  }
  if (shouldRecord !== '1') return;

  // ── Load rrweb from CDN ────────────────────────────────────────────────────
  // In production: npm install rrweb and import { record } from 'rrweb' instead
  const script = document.createElement('script');
  script.src = '/lib/rrweb.min.js';
  script.onload = initRecorder;
  document.head.appendChild(script);

  // ── State ──────────────────────────────────────────────────────────────────
  let sessionId = sessionStorage.getItem('rrweb_session_id');
  let stopFn = null;
  let eventBuffer = [];
  let flushTimer = null;

  function emitSessionEvent() {
    window.dispatchEvent(
      new CustomEvent('rrweb:session', {
        detail: {
          sessionId,
          transport: useWebSocket ? 'ws' : 'http',
          serverUrl: SERVER_URL,
        },
      })
    );
  }

  window.rrwebRecorderConfig = {
    get sessionId() {
      return sessionId;
    },
    get transport() {
      return useWebSocket ? 'ws' : 'http';
    },
    serverUrl: SERVER_URL,
    flushIntervalMs: FLUSH_INTERVAL,
    sampleRate: SAMPLE_RATE,
    switchTransport(mode) {
      const next = mode === 'ws' ? 'ws' : 'http';
      localStorage.setItem('rrweb_transport', next);
      location.reload();
    },
    startNewSession() {
      sessionStorage.removeItem('rrweb_session_id');
      sessionStorage.removeItem('rrweb_record');
      location.reload();
    },
    clearSamplingDecision() {
      sessionStorage.removeItem('rrweb_record');
      location.reload();
    },
  };

  // ── Session creation ───────────────────────────────────────────────────────
  async function ensureSession() {
    if (sessionId) return sessionId;

    const res = await fetch(`${SERVER_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: location.href,
        userAgent: navigator.userAgent,
      }),
    });
    const { sessionId: id } = await res.json();
    sessionId = id;
    sessionStorage.setItem('rrweb_session_id', id);
    emitSessionEvent();
    return id;
  }

  // ── Flush events to server ─────────────────────────────────────────────────
  async function flush(useBeacon = false) {
    if (eventBuffer.length === 0) return;

    const toSend = eventBuffer.splice(0, eventBuffer.length); // drain buffer
    const body = JSON.stringify({ events: toSend });

    if (useBeacon) {
      // sendBeacon is fire-and-forget, works during page unload
      navigator.sendBeacon(
        `${SERVER_URL}/api/sessions/${sessionId}/events`,
        new Blob([body], { type: 'application/json' })
      );
      return;
    }

    try {
      await fetch(`${SERVER_URL}/api/sessions/${sessionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch (e) {
      // Put events back if network failed
      eventBuffer.unshift(...toSend);
    }
  }

  // ── WebSocket transport (for live mode) ────────────────────────────────────
  let ws = null;

  function wsBaseUrl() {
    if (SERVER_URL.startsWith('https://')) return SERVER_URL.replace('https://', 'wss://');
    if (SERVER_URL.startsWith('http://')) return SERVER_URL.replace('http://', 'ws://');
    return SERVER_URL;
  }

  function connectWebSocket() {
    ws = new WebSocket(`${wsBaseUrl()}/live?session=${sessionId}&role=recorder`);

    ws.onopen = () => {
      if (eventBuffer.length > 0) {
        const queued = eventBuffer.splice(0, eventBuffer.length);
        wsFlush(queued);
      }
    };

    ws.onclose = () => {
      setTimeout(connectWebSocket, 2000); // auto-reconnect
    };
  }

  function wsFlush(events) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      eventBuffer.push(...events);
      return;
    }
    ws.send(JSON.stringify({ events }));
  }

  // ── Main recorder init ─────────────────────────────────────────────────────
  async function initRecorder() {
    await ensureSession();

    if (useWebSocket) connectWebSocket();

    stopFn = rrweb.record({
      // Called on every captured event
      emit(event, isCheckout) {
        if (useWebSocket) {
          wsFlush([event]);
        } else {
          eventBuffer.push(event);
        }
      },

      // Privacy controls
      maskInputOptions: {
        password: true,
        email: false,   // set true if you don't need emails
        tel: true,
      },
      blockClass: 'rr-block',         // add class to any element to block it
      maskTextClass: 'rr-mask',       // add class to mask text with ****
      ignoreClass: 'rr-ignore',       // input events on this element ignored
      // blockSelector: '[data-private]',  // block by CSS selector too

      // Performance: sample mouse moves (1 in 10)
      sampling: {
        mousemove: 50,         // record 1 in 50 mouse-move events
        mouseInteraction: true,
        scroll: 150,           // ms throttle on scroll events
        input: 'last-enabled', // only record final input value
      },

      // Periodic full snapshots every 30s (lets replay start from any point)
      checkoutEveryNms: 30000,

      // Capture console errors (great for bug reproduction)
      plugins: [],  // add rrweb plugins here (console, network, etc.)

      errorHandler(err) {
        console.warn('[rrweb]', err);
      },
    });

    // Start periodic flush
    flushTimer = setInterval(() => {
      if (useWebSocket) {
        if (eventBuffer.length > 0) {
          const queued = eventBuffer.splice(0, eventBuffer.length);
          wsFlush(queued);
        }
        return;
      }
      flush();
    }, FLUSH_INTERVAL);

    // Flush on tab close / navigation
    window.addEventListener('beforeunload', () => flush(true));
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush(true);
    });

    console.debug('[rrweb] Recording started. Session:', sessionId);
    emitSessionEvent();
  }

  // ── Public API: custom events ──────────────────────────────────────────────
  // Call window.rrwebTrack('button_clicked', { buttonId: 'checkout' }) anywhere
  window.rrwebTrack = function (tag, payload = {}) {
    eventBuffer.push({
      type: 5, // EventType.Custom
      timestamp: Date.now(),
      data: { tag, payload },
    });
  };

  // ── Public API: stop recording ─────────────────────────────────────────────
  window.rrwebStop = function () {
    if (stopFn) stopFn();
    clearInterval(flushTimer);
    flush(true);
  };

  // ── Force-record on JS error ───────────────────────────────────────────────
  window.addEventListener('error', (e) => {
    window.rrwebTrack('js_error', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
    });
    flush(); // flush immediately on error
  });

  window.addEventListener('unhandledrejection', (e) => {
    window.rrwebTrack('unhandled_promise', { reason: String(e.reason) });
    flush();
  });

})();
