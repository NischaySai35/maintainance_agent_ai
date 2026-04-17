# AURA SOVEREIGN – Physics-Validated Autonomous Maintenance System

A production-grade, full-stack AI-powered predictive maintenance system.

The system acts like a thinking maintenance engineer — it distinguishes real failures
from sensor noise, explains every decision, and operates autonomously in a continuous
closed-loop pipeline:

```
Data ingestion → Physics validation → Baseline comparison → Multi-agent reasoning
  → Risk scoring → Priority scheduling → Alert / action execution
```

---

## Architecture

### Backend (`FastAPI + asyncio`)
| Layer | Module | Description |
|---|---|---|
| Ingestion | `backend/ingestion/simulator.py` | Simulates 4 machines (M-101…M-104) at ~1 Hz with realistic noise, drift, spikes, and 4 % random dropout |
| Physics | `backend/physics/validation.py` | Physical-Inertia Validation (PIV) — rejects thermally/mechanically impossible sensor jumps |
| Memory | `backend/memory/baseline.py` | Maintains 7-day rolling history per machine; computes mean/std/rolling/trend and operational regime |
| Anomaly | `backend/anomaly/detector.py` | Detects *spike*, *drift*, and *compound* anomalies using z-score + moving-average deviation |
| Agents | `backend/agents/reasoning.py` | Multi-agent reasoning: **Sentinel** → **Physicist** → **Historian** → **Orchestrator** |
| Risk | `backend/risk/scoring.py` | Risk score 0–100 based on deviation, duration, and multi-sensor involvement |
| Actions | `backend/actions/manager.py` | Auto-posts alerts (`/alert`) and schedules maintenance (`/schedule-maintenance`) |
| Fault Tolerance | `simulator.py` | Dead-reckoning (shadow-state recovery) when stream drops; resumes on reconnection |
| Cross-machine | `backend/main.py` | Detects shared thermal/vibration anomalies across all machines |

### Frontend (`Next.js 15 + Tailwind CSS + Three.js`)
| Zone | Component | Description |
|---|---|---|
| Zone 1 | `SensorGrid` | Live sensor readings + risk score per machine |
| Zone 1 | `AlertLog` | Chronological alert log (real failures and filtered noise) |
| Zone 2 | `EntropySpheres` | 3D spheres that turn red / enlarge as risk rises |
| Zone 2 | `StateSpacePlot` | 3D scatter (T/V/RPM axes) — red dot = outlier |
| War Room | `AgentWarRoom` | Live scrolling multi-agent reasoning log |

---

## Project Structure

```
backend/
  main.py                 ← FastAPI app + continuous pipeline
  ingestion/
    simulator.py          ← MachineSimulator with dead-reckoning
  physics/
    validation.py         ← Physical-Inertia Validator (PIV)
  memory/
    baseline.py           ← Rolling history + dynamic baselines
  anomaly/
    detector.py           ← Spike / drift / compound detection
  agents/
    reasoning.py          ← Multi-agent reasoning engine
  risk/
    scoring.py            ← Risk scorer + priority queue
  actions/
    manager.py            ← Alert & maintenance-schedule manager
  models/
    schemas.py            ← Pydantic models for all data types

frontend/
  components/
    SensorGrid.tsx
    AlertLog.tsx
    AgentWarRoom.tsx
  3d/
    EntropySpheres.tsx
    StateSpacePlot.tsx
  hooks/
    useSSE.ts             ← EventSource hook with reconnect logic
  pages/
    _app.tsx
    index.tsx             ← Dashboard page
  styles/
    globals.css

tests/
  test_backend_pipeline.py
```

---

## Running the System

### 1. Backend

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | System info |
| `GET` | `/state` | Snapshot: machines, alerts, schedule, reasoning log |
| `GET` | `/stream` | SSE — real-time machine events at ~1 Hz/machine |
| `POST` | `/alert` | Manually log an alert |
| `POST` | `/schedule-maintenance` | Manually schedule maintenance |

---

## Running Tests

```bash
python -m unittest discover -s tests -q
```

---

## Key Behaviours

* **No false alarms from sensor noise** — PIV rejects physically impossible readings before they reach the anomaly pipeline.
* **Dead-reckoning** — if a machine stream drops (simulated at 4 % probability), the system predicts the next state using last-known values and clearly marks predictions in the UI.
* **Compound anomaly detection** — when temperature, vibration, *and* RPM all deviate together, the system scores it as a compound event and raises the risk score significantly.
* **Cross-machine intelligence** — if ≥ 2 machines simultaneously exhibit thermal or vibration excursions, the Orchestrator notes a shared environmental cause.
* **Explainability** — every decision includes a full reasoning log from all four agents.
