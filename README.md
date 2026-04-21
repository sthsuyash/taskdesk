# rrweb demo

Session replay built on [rrweb](https://www.rrweb.io/).

## Quick Start

```bash
# Install dependencies
cd ui && pnpm install
cd ../server && pnpm install

# Start server (port 8000)
cd server && pnpm dev

# Start frontend (port 5173) - in another terminal
cd ui && pnpm dev
```

## Project Structure

```md
rrweb/
├── ui/       # React frontend (Vite + React Router)
├── server/   # Express + WebSocket API server
└── docs/     # Documentation
```

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions/:id/events` | Append events |
| GET | `/api/sessions/:id/events` | Get session events |
| DELETE | `/api/sessions/:id` | Delete session |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| WS | `/live` | Live replay |
