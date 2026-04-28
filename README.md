# TaskDesk

Task management app with session replay powered by [rrweb](https://www.rrweb.io/).

## Products

| Product | Description |
| --- | --- |
| **Landing** | Marketing site |
| **App** | Customer task management + session recording |
| **Dashboard** | Admin/support console for sessions & users |
| **Server** | REST API + live WebSocket |

## Get Started

```bash
# Install
cd landing && pnpm install && cd ..
cd ui && pnpm install && cd ..
cd dashboard && pnpm install && cd ..
cd server && pnpm install && cd ..

# Run
cd server && pnpm dev
cd ui && pnpm dev
cd dashboard && pnpm dev
cd landing && pnpm dev
```

Each app reads its runtime URLs from its own `.env` file. Update the matching
`.env` before running in a different environment.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, PostgreSQL, WebSocket
- **Recording**: @rrweb/record

## User Roles

- **User** - Create/manage own tasks, session recording enabled
- **Support** - View all sessions, manage users only
- **Admin** - Full access to all features

## License

[MIT](./LICENSE)
