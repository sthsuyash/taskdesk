function readUrl(rawValue: string | undefined, key: string, allowedProtocols: string[]) {
    if (!rawValue) {
        throw new Error(`[env] ${key} is required`);
    }

    let parsed: URL;

    try {
        parsed = new URL(rawValue);
    } catch {
        throw new Error(`[env] ${key} must be an absolute URL. Received: ${rawValue}`);
    }

    if (!allowedProtocols.includes(parsed.protocol)) {
        throw new Error(
            `[env] ${key} must use one of ${allowedProtocols.join(', ')}. Received: ${rawValue}`
        );
    }

    return parsed.toString().replace(/\/$/, '');
}

export const env = {
    apiUrl: readUrl(import.meta.env.VITE_API_URL, 'VITE_API_URL', ['http:', 'https:']),
    liveUrl: readUrl(import.meta.env.VITE_LIVE_URL, 'VITE_LIVE_URL', ['ws:', 'wss:']),
    dashboardUrl: readUrl(import.meta.env.VITE_DASHBOARD_URL, 'VITE_DASHBOARD_URL', [
        'http:',
        'https:',
    ]),
};
