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
cd server && pnpm dev       # localhost:8000
cd ui && pnpm dev          # localhost:5173
cd dashboard && pnpm dev    # localhost:5174
cd landing && pnpm dev      # localhost:5175
```

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, PostgreSQL, WebSocket
- **Recording**: @rrweb/record

## User Roles

- **User** - Create/manage own tasks, session recording enabled
- **Support** - View all sessions, manage users only
- **Admin** - Full access to all features

## License

MIT