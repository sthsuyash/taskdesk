const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

if (!process.env.AUTH_COOKIE_NAME) {
    throw new Error('AUTH_COOKIE_NAME is required');
}

export const env = {
    port: Number(process.env.PORT || 8000),
    databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5434/taskdesk',
    allowedOrigins,
    authCookieName: process.env.AUTH_COOKIE_NAME,
    authCookieSecure: process.env.AUTH_COOKIE_SECURE === 'true',
    adminSeedEmail: process.env.ADMIN_SEED_EMAIL || 'admin@taskdesk.local',
    adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || 'ChangeMe123!',
    supportSeedEmail: process.env.SUPPORT_SEED_EMAIL || 'support@taskdesk.local',
    supportSeedPassword: process.env.SUPPORT_SEED_PASSWORD || 'ChangeMe123!',
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
    sessionCleanupIntervalMs: Number(process.env.SESSION_CLEANUP_INTERVAL_MS || 60 * 60 * 1000),
};
