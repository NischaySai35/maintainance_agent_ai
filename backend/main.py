"""AURA SOVEREIGN — FastAPI application entry point.

Provides:
  GET  /           — system info
  GET  /state      — current snapshot of all machines + alerts
  GET  /stream     — SSE stream (~1 Hz per machine) driving the dashboard
  POST /alert      — manual alert logging
  POST /schedule-maintenance — manual maintenance scheduling
"""
from __future__ import annotations

import asyncio
import json
from collections import deque
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.actions.manager import ActionManager
from backend.agents.reasoning import MultiAgentReasoner
from backend.anomaly.detector import AnomalyDetector
from backend.ingestion.simulator import MachineSimulator
from backend.memory.baseline import BaselineMemory
from backend.models.schemas import AlertRequest, ScheduleRequest, SensorReading
from backend.physics.validation import PhysicalInertiaValidator
from backend.risk.scoring import RiskScorer

# -----------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------
MACHINE_IDS = ["M-101", "M-102", "M-103", "M-104"]
REASONING_LOG_MAX = 500
ALERT_SNAPSHOT_MAX = 50


# -----------------------------------------------------------------------
# Pipeline runtime — holds all stateful components
# -----------------------------------------------------------------------
class PipelineRuntime:
    """Coordinates all pipeline layers for the full machine fleet."""

    def __init__(self) -> None:
        self.validator = PhysicalInertiaValidator()
        self.memory = BaselineMemory()
        self.detector = AnomalyDetector()
        self.scorer = RiskScorer()
        self.reasoner = MultiAgentReasoner()
        self.actions = ActionManager()

        self.simulators: list[MachineSimulator] = [
            MachineSimulator(mid, seed=idx + 42)
            for idx, mid in enumerate(MACHINE_IDS)
        ]

        # Per-machine state cache — used by /state and the SSE loop
        self.latest: dict[str, dict] = {}
        self.reasoning_log: deque[str] = deque(maxlen=REASONING_LOG_MAX)
        self._tick = 1
        self._lock = asyncio.Lock()

    def bootstrap(self) -> None:
        """Pre-fill baseline memory with synthetic 7-day history."""
        for sim in self.simulators:
            for reading in sim.historical_bootstrap():
                self.memory.add(reading)
            # Seed latest with the last bootstrapped reading
            if sim.last_reading is not None:
                mid = sim.machine_id
                self.latest[mid] = {
                    "reading": sim.last_reading.model_dump(mode="json"),
                    "risk_score": 0.0,
                    "decision": "Bootstrapping complete",
                    "reasoning_log": [],
                    "validation_reason": "initial",
                    "predicted": False,
                    "priority_rank": 0,
                }

    async def tick(self) -> list[dict]:
        """Run one pipeline tick across all machines and return serialisable
        output payloads."""
        async with self._lock:
            candidates = [sim.next_live(self._tick) for sim in self.simulators]
            shared = self._detect_shared_event(candidates)
            payloads: list[dict] = []

            for reading in candidates:
                payload = self._process_one(reading, shared)
                payloads.append(payload)

            self._rerank_priority()
            self._tick += 1
            return payloads

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _process_one(
        self, reading: SensorReading, shared: str | None
    ) -> dict:
        mid = reading.machine_id

        # Retrieve the last accepted reading for physics comparison
        prev_raw = self.latest.get(mid, {}).get("reading")
        previous: SensorReading | None = (
            SensorReading.model_validate(prev_raw) if prev_raw else None
        )

        validation = self.validator.validate(reading, previous)
        accepted = validation.reading

        self.memory.add(accepted)
        baseline = self.memory.compute(accepted)
        finding = self.detector.detect(accepted, baseline)
        risk = self.scorer.score(finding)
        decision = self.reasoner.reason(
            machine_id=mid,
            validation=validation,
            baseline=baseline,
            finding=finding,
            risk=risk,
            shared_event=shared,
        )

        # Auto-trigger actions based on risk threshold
        alert_payload = None
        schedule_payload = None
        if risk.risk_score >= 50:
            alert_payload = self.actions.post_alert(
                AlertRequest(
                    machine_id=mid,
                    message=decision.final_decision,
                    risk_score=risk.risk_score,
                    category="real_failure" if risk.risk_score >= 80 else "warning",
                )
            )
        if risk.risk_score >= 80:
            schedule_payload = self.actions.schedule(
                ScheduleRequest(
                    machine_id=mid,
                    risk_score=risk.risk_score,
                    reason=decision.final_decision,
                )
            )

        # Update the per-machine state cache
        self.latest[mid] = {
            "reading": accepted.model_dump(mode="json"),
            "risk_score": risk.risk_score,
            "decision": decision.final_decision,
            "reasoning_log": decision.reasoning_log,
            "validation_reason": validation.reason,
            "predicted": accepted.predicted,
            "priority_rank": self.latest.get(mid, {}).get("priority_rank", 0),
            "regime": baseline.regime,
            "anomaly_types": finding.anomaly_types,
        }
        self.reasoning_log.extend(decision.reasoning_log)

        return {
            "reading": accepted.model_dump(mode="json"),
            "validation": validation.model_dump(mode="json"),
            "baseline": baseline.model_dump(mode="json"),
            "finding": finding.model_dump(mode="json"),
            "decision": decision.model_dump(mode="json"),
            "risk": risk.model_dump(mode="json"),
            "alert": alert_payload,
            "schedule": schedule_payload,
        }

    @staticmethod
    def _detect_shared_event(readings: list[SensorReading]) -> str | None:
        """Return a human-readable description if a cross-machine event is
        detected (e.g. ambient temperature excursion or power surge)."""
        hot = [r for r in readings if r.temperature > 84]
        vibrating = [r for r in readings if r.vibration > 2.5]
        if len(hot) >= 2:
            return (
                f"{len(hot)} machines simultaneously over-temperature — "
                "possible ambient/environmental event"
            )
        if len(vibrating) >= 2:
            return (
                f"{len(vibrating)} machines with high vibration simultaneously — "
                "possible upstream mechanical disturbance"
            )
        return None

    def _rerank_priority(self) -> None:
        """Sort machines by risk score and assign priority_rank (1 = highest)."""
        ranked = sorted(
            self.latest.items(),
            key=lambda kv: kv[1].get("risk_score", 0),
            reverse=True,
        )
        for rank, (mid, _) in enumerate(ranked, start=1):
            self.latest[mid]["priority_rank"] = rank


# -----------------------------------------------------------------------
# Application setup
# -----------------------------------------------------------------------
runtime = PipelineRuntime()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    runtime.bootstrap()
    yield


app = FastAPI(
    title="AURA SOVEREIGN",
    description="Physics-Validated Autonomous Maintenance System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------

@app.get("/", summary="System info")
async def root() -> dict:
    return {
        "name": "AURA SOVEREIGN",
        "description": "Physics-Validated Autonomous Maintenance System",
        "pipeline": "ingestion → physics → baseline → agents → risk → actions",
        "machines": MACHINE_IDS,
        "tick": runtime._tick,
    }


@app.get("/state", summary="Current fleet snapshot")
async def state() -> dict:
    """Returns the latest state for all machines plus recent alerts and
    reasoning logs."""
    return {
        "machines": runtime.latest,
        "alerts": runtime.actions.alert_log[-ALERT_SNAPSHOT_MAX:],
        "scheduled_maintenance": runtime.actions.scheduled[-ALERT_SNAPSHOT_MAX:],
        "reasoning_log": list(runtime.reasoning_log)[-150:],
    }


@app.get("/stream", summary="SSE — real-time machine events")
async def stream() -> StreamingResponse:
    """Server-Sent Events endpoint.  Emits one ``machine`` event per machine
    per tick (~1 Hz), carrying the full pipeline output as JSON."""

    async def generator():
        while True:
            payloads = await runtime.tick()
            for payload in payloads:
                data = json.dumps(payload, default=str)
                yield f"event: machine\ndata: {data}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(generator(), media_type="text/event-stream")


@app.post("/alert", summary="Log an alert manually")
async def post_alert(request: AlertRequest) -> dict:
    return runtime.actions.post_alert(request)


@app.post("/schedule-maintenance", summary="Schedule maintenance manually")
async def schedule_maintenance(request: ScheduleRequest) -> dict:
    return runtime.actions.schedule(request)
