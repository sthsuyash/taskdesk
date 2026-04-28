const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

export const env = {
    port: Number(process.env.PORT || 8000),
    databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5434/taskdesk',
    allowedOrigins,
    authCookieName: process.env.AUTH_COOKIE_NAME || 'taskdesk.auth',
    authCookieSecure: process.env.AUTH_COOKIE_SECURE === 'true',
    adminSeedEmail: process.env.ADMIN_SEED_EMAIL || 'admin@taskdesk.local',
    adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || 'ChangeMe123!',
    supportSeedEmail: process.env.SUPPORT_SEED_EMAIL || 'support@taskdesk.local',
    supportSeedPassword: process.env.SUPPORT_SEED_PASSWORD || 'ChangeMe123!',
};
