# AURA SOVEREIGN

Physics-validated predictive maintenance platform with a FastAPI backend pipeline and a Next.js dashboard frontend.

## Current Architecture

### Backend (FastAPI)
- Entry: backend/main.py
- Live API for UI: GET /state, WebSocket /ws, POST /alert, POST /schedule-maintenance
- Pipeline modules:
  - backend/ingestor.py (SSE ingestion + dead-reckoning fallback)
  - backend/piv.py (physics validation)
  - backend/baseline.py (rolling baselines)
  - backend/detector.py (spike/drift/compound detection)
  - backend/cusum.py, backend/model.py, backend/agent.py, backend/actions.py

### Frontend (Next.js App Router)
- Entry page: frontend/src/app/dashboard/page.tsx
- Data hook: frontend/src/hooks/useSimulatedStream.ts
  - seeds from GET /state
  - receives live updates from /ws
  - maps backend snake_case payloads to SensorReading
- 3D diagnostics:
  - frontend/src/components/3d/EntropySphere.tsx (panel-safe advanced visual)

## Data Flow

1. Backend ingests per-machine sensor events from a simulator SSE source.
2. Backend pipeline validates and scores each reading.
3. Backend broadcasts machine_update payloads over /ws.
4. Frontend hook merges /state seed + /ws deltas into dashboard state.
5. Dashboard cards/charts/alerts/entropy component render from the same normalized reading store.

## Environment Variables

### Backend
- SIM_BASE_URL (optional)
  - default: unset
  - when set, used for simulator history and stream source (for example /history/{machine_id} and /stream/{machine_id})
  - when unset, the backend runs in synthetic-only mode and keeps the dashboard live without external SSE input

### Frontend
- NEXT_PUBLIC_BACKEND_URL (optional)
  - default: http://localhost:8000
  - used by useSimulatedStream to call /state and /ws

## Setup

### 1. Backend

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Alternative (equivalent):

```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Verification Commands

### Frontend

```bash
cd frontend
npm run lint
npm run build
```

### Backend

```bash
python backend/test_pipeline_local.py
python -m unittest discover -s tests -v
```

## Troubleshooting

- If you see repeated `GET /stream/<machine_id> 404` in frontend/backend logs:
  - some process is still pointing at a simulator endpoint that is not running.
  - frontend uses `http://localhost:3000` by default, so do not use that as simulator base.
  - if you want a real simulator, set `SIM_BASE_URL` to its host explicitly.
  - if you do not have a simulator, leave `SIM_BASE_URL` unset and the backend will stay in synthetic mode.

- If no simulator is running, backend now falls back to synthetic predicted readings so the dashboard stays live.

## API Reference (Backend)

| Method | Path | Purpose |
|---|---|---|
| GET | / | Service metadata |
| GET | /state | Snapshot for all machines, alerts, maintenance |
| POST | /alert | Manual alert injection |
| POST | /schedule-maintenance | Manual maintenance injection |
| WS | /ws | Live machine_update/manual events |

## Integration Checklist

- Frontend machine ids match backend ids (CNC_01, CNC_02, PUMP_03, CONVEYOR_04).
- Frontend baseline constants include all active machines.
- SensorReading type includes predicted flag for shadow/dead-reckoning states.
- Entropy panel consumes selected machine reading from dashboard state.
- Backend action logs use ASCII-safe output for Windows terminals.
