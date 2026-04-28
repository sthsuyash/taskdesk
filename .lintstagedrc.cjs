const { execSync } = require('child_process');

module.exports = {
    'ui/src/**/*.{ts,tsx}': () => 'pnpm --filter taskdesk-ui run lint:fix',
    'dashboard/src/**/*.{ts,tsx}': () => 'pnpm --filter taskdesk-dashboard run lint:fix',
    'landing/src/**/*.{ts,tsx}': () => 'pnpm --filter taskdesk-landing run lint:fix',
    'server/src/**/*.ts': () => 'pnpm --filter taskdesk-server run lint:fix',
};