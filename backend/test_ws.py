import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://localhost:8000/ws"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket.")
            for _ in range(5):
                message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                data = json.loads(message)
                print(f"Received: {data.get('machine_id')} - {data.get('event')}")
    except Exception as e:
        print(f"Failed: {e}")

asyncio.run(test_ws())
