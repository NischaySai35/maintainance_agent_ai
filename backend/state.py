"""
state.py — Aura Sovereign Global State Store
============================================
Central in-memory store shared across all pipeline modules.
Holds latest machine snapshots, WebSocket client registry, and
references to all pipeline component instances.
"""
from __future__ import annotations

import asyncio
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Set

from fastapi import WebSocket


# ---------------------------------------------------------------------------
# Machine metadata
# ---------------------------------------------------------------------------
MACHINE_IDS: list[str] = ["CNC_01", "CNC_02", "PUMP_03", "CONVEYOR_04"]

SIM_BASE_URL: str = "http://localhost:3000"

MACHINE_TYPE: dict[str, str] = {
    "CNC_01":      "cnc",
    "CNC_02":      "cnc",
    "PUMP_03":     "pump",
    "CONVEYOR_04": "conveyor",
}

# ---------------------------------------------------------------------------
# Per-machine snapshot
# ---------------------------------------------------------------------------
@dataclass
class MachineSnapshot:
    machine_id:       str
    timestamp:        str                  = ""
    temperature_C:    float                = 0.0
    vibration_mm_s:   float                = 0.0
    rpm:              float                = 0.0
    current_A:        float                = 0.0
    status:           str                  = "unknown"
    regime:           str                  = "idle"
    predicted:        bool                 = False
    piv_accepted:     bool                 = True
    piv_reason:       str                  = ""
    anomaly_types:    list[str]            = field(default_factory=list)
    z_scores:         dict[str, float]     = field(default_factory=dict)
    cusum_values:     dict[str, float]     = field(default_factory=dict)
    risk_score:       float                = 0.0
    explanation:      str                  = ""
    alert_sent:       bool                 = False
    maintenance_sent: bool                 = False


# ---------------------------------------------------------------------------
# Application-level state container
# ---------------------------------------------------------------------------
class AppState:
    def __init__(self) -> None:
        self.snapshots: dict[str, MachineSnapshot] = {
            mid: MachineSnapshot(machine_id=mid) for mid in MACHINE_IDS
        }

        self.alert_log:       deque[dict] = deque(maxlen=500)
        self.maintenance_log: deque[dict] = deque(maxlen=500)
        self.event_log:       deque[str]  = deque(maxlen=1000)

        self.ws_clients: Set[WebSocket] = set()
        self._ws_lock: asyncio.Lock = asyncio.Lock()

        # Pipeline component instances
        self.baseline:  Any = None
        self.piv:       Any = None
        self.detector:  Any = None
        self.scorer:    Any = None  # Now likely part of intelligence model
        self.shadow:    Any = None
        self.actions:   Any = None
        self.explainer: Any = None
        self.cusum:     Any = None
        self.ml_model:  Any = None

        self.ingestor_tasks: dict[str, asyncio.Task] = {}

    async def connect_ws(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._ws_lock:
            self.ws_clients.add(ws)
        self.event_log.append(f"[WS] Client connected — total: {len(self.ws_clients)}")

    async def disconnect_ws(self, ws: WebSocket) -> None:
        async with self._ws_lock:
            self.ws_clients.discard(ws)
        self.event_log.append(f"[WS] Client disconnected — total: {len(self.ws_clients)}")

    async def broadcast(self, payload: dict) -> None:
        import json
        dead: set[WebSocket] = set()
        message = json.dumps(payload, default=str)

        async with self._ws_lock:
            clients = list(self.ws_clients)

        for client in clients:
            try:
                await client.send_text(message)
            except Exception:
                dead.add(client)

        if dead:
            async with self._ws_lock:
                self.ws_clients -= dead

app_state = AppState()
