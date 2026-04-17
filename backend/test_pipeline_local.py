"""
test_pipeline_local.py
======================
Bootstraps the ML models with simulated history and feeds a highly anomalous 
data point to prove that Spike, Drift, CUSUM, LogisticRegression and Agent workflows
successfully output the requested Risk Reports.
"""
import sys
import asyncio
import json
from pprint import pprint

from state import app_state
from main import _bootstrap, lifespan
from ingestor import _process_reading

def generate_mock_history():
    history = []
    # 3 days of healthy idle data for CNC_01
    for i in range(100):
        history.append({
            "machine_id": "CNC_01",
            "temperature_C": 45.0 + (i % 2),
            "vibration_mm_s": 0.5 + (0.1 * (i % 2)),
            "rpm": 1200 + (10 * (i % 2)),
            "current_A": 5.0 + (0.2 * (i % 2)),
            "status": "running"
        })
    # 2 days of healthy active data
    for i in range(50):
        history.append({
            "machine_id": "CNC_01",
            "temperature_C": 70.0 + (i % 2),
            "vibration_mm_s": 2.5 + (0.1 * (i % 2)),
            "rpm": 2500 + (20 * (i % 2)),
            "current_A": 15.0 + (0.5 * (i % 2)),
            "status": "running"
        })
    # Include some artificial spikes to give the logistic model failure cases to learn from
    for i in range(20):
        history.append({
            "machine_id": "CNC_01",
            "temperature_C": 120.0,  # Huge spike
            "vibration_mm_s": 8.0,
            "rpm": 2500,
            "current_A": 25.0,
            "status": "warning"
        })
    return history

async def mock_fetch_history(machine_id, client):
    """Overrides the default fetch to return our mocked data."""
    if machine_id == "CNC_01":
        return generate_mock_history()
    return []

async def test_run():
    import main
    # Override fetch function to not depend on node server
    main._fetch_history = mock_fetch_history
    
    print("\n[1] Starting Backend Lifespan (ML Training)...")
    async with main.lifespan(main.app):
        print("\n[2] Models Trained. Injecting a highly anomalous stream point...")
        
        # Generate two readings 10 seconds apart to prove it's a realistic drift, not sensor noise
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        
        prev = {
            "machine_id": "CNC_01",
            "timestamp": (now - timedelta(seconds=10)).isoformat(),
            "temperature_C": 70.0, "vibration_mm_s": 2.5, "rpm": 2500, "current_A": 15.0
        }
        terrible_reading = {
            "machine_id": "CNC_01",
            "timestamp": now.isoformat(),
            "temperature_C": 105.5,    # Gradual drift + spike
            "vibration_mm_s": 9.2,     # High vibration
            "rpm": 2500.0,             # Keep regime active
            "current_A": 22.0,         # High current overrides
            "status": "warning"
        }
        
        # Process in the pipeline
        payload = await _process_reading(terrible_reading, prev, app_state)
        
        print("\n[3] PIPELINE REPORT GENERATED:")
        print(f"Machine: {payload['machine_id']}")
        print(f"Detected Anomalies: {payload['anomaly_types']}")
        print(f"Calculated Risk Score: {payload['risk_score']} / 100")
        print(f"Recommended Action: {payload['action']['action']}")
        print("\nAgent War Room Reasoning Breakdown:")
        for agent, thought in payload.get("reasoning", {}).items():
            print(f" - {agent.title()}: {thought}")
            
        print("\n[4] Complete Internal Payload for Frontend WS Broadcast:")
        pprint(payload, depth=3)

if __name__ == "__main__":
    asyncio.run(test_run())
