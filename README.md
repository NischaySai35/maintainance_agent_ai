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
  - default: http://localhost:3000
  - used for simulator history and stream source (for example /history/{machine_id} and /stream/{machine_id})

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
```

Notes:
- tests/test_backend_pipeline.py currently targets a legacy package layout (backend.anomaly.*, backend.models.*) and is not aligned with the active module layout used by backend/main.py.

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
