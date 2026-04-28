function readUrl(rawValue: string | undefined, key: string) {
    if (!rawValue) {
        throw new Error(`[env] ${key} is required`);
    }

    let parsed: URL;

    try {
        parsed = new URL(rawValue);
    } catch {
        throw new Error(`[env] ${key} must be an absolute URL. Received: ${rawValue}`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`[env] ${key} must use http: or https:. Received: ${rawValue}`);
    }

    return parsed.toString().replace(/\/$/, '');
}

export const env = {
    appUrl: readUrl(import.meta.env.VITE_APP_URL, 'VITE_APP_URL'),
    dashboardUrl: readUrl(import.meta.env.VITE_DASHBOARD_URL, 'VITE_DASHBOARD_URL'),
    docsUrl: readUrl(import.meta.env.VITE_DOCS_URL, 'VITE_DOCS_URL'),
};