const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

export const env = {
    port: Number(process.env.PORT || 8000),
    databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5434/rrweb',
    allowedOrigins,
};