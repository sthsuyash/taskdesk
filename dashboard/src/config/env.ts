const DEFAULT_API_URL = 'http://localhost:8000';
const DEFAULT_LIVE_URL = 'ws://localhost:8000';

function readUrl(rawValue: string, key: string, allowedProtocols: string[]) {
    let parsed: URL;

    try {
        parsed = new URL(rawValue);
    } catch {
        throw new Error(`[env] ${key} must be an absolute URL. Received: ${rawValue}`);
    }

    if (!allowedProtocols.includes(parsed.protocol)) {
        throw new Error(`[env] ${key} must use one of ${allowedProtocols.join(', ')}. Received: ${rawValue}`);
    }

    return parsed.toString().replace(/\/$/, '');
}

export const env = {
    apiUrl: readUrl(import.meta.env.VITE_API_URL || DEFAULT_API_URL, 'VITE_API_URL', ['http:', 'https:']),
    liveUrl: readUrl(import.meta.env.VITE_LIVE_URL || DEFAULT_LIVE_URL, 'VITE_LIVE_URL', ['ws:', 'wss:']),
};