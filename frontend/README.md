# Aura Sovereign Frontend

Next.js dashboard for the Aura Sovereign predictive maintenance platform. This app renders the fleet monitoring UI, dashboard analytics, 3D diagnostics, and agent-style operational panels.

## What This Frontend Does

- Shows machine health cards, live alerts, and maintenance actions.
- Renders the selected machine hero panel with risk and sensor details.
- Displays the trends chart with temperature, vibration, RPM, and current.
- Animates the entropy sphere for visual diagnostics.
- Connects to the backend `GET /state` endpoint and WebSocket `/ws` stream.
- Falls back to local synthetic motion when the backend is in synthetic-only mode.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Recharts for line charts
- Three.js with React Three Fiber for the 3D diagnostic view
- Tailwind CSS for styling

## Project Structure

- `src/app/` - routes, layouts, and page shells
- `src/components/dashboard/` - main dashboard widgets
- `src/components/landing/` - marketing pages and landing content
- `src/components/3d/` - entropy visualization
- `src/hooks/` - streaming state and simulated telemetry
- `src/lib/` - shared constants, mock telemetry, and helpers

## Prerequisites

- Node.js 18 or newer
- npm
- The backend running at `http://localhost:8000` unless `NEXT_PUBLIC_BACKEND_URL` is changed

## Getting Started

From the `frontend` folder:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

### `NEXT_PUBLIC_BACKEND_URL`

- Optional
- Default: `http://localhost:8000`
- Used by the dashboard to fetch `/state` and connect to `/ws`

If the backend is not available, the frontend keeps running with synthetic motion and locally generated telemetry so the UI still feels live.

## Common Commands

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## How The Data Flows

1. The frontend loads the latest snapshot from `GET /state`.
2. It opens a WebSocket connection to `/ws` for live updates.
3. The stream hook maps backend payloads into dashboard state.
4. The dashboard cards, charts, alerts, and entropy visualization all consume that shared state.
5. If the backend is synthetic-only or unavailable, the hook generates animated fallback telemetry locally.

## Troubleshooting

- If the dashboard says synthetic-only mode, the backend is running without a simulator configured. That is expected when `SIM_BASE_URL` is unset.
- If you want real external telemetry, start the simulator and set `SIM_BASE_URL` in the backend environment before launching the server.
- If the UI looks static, make sure both the backend and frontend are restarted after changing environment variables.
- If `npm run dev` fails, confirm you are running it from the `frontend` directory.

## Notes

- The landing pages and dashboard are part of the same Next.js app.
- The frontend does not need direct access to the simulator. It only talks to the backend API.
- The dashboard is designed to stay visually active even when the backend is in fallback mode.
