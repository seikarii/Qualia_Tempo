#!/usr/bin/env python3
import asyncio
import websockets

async def simple_test():
    try:
        uri = "ws://127.0.0.1:8000/ws/test"
        print("Connecting to WebSocket...")
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")
            message = await websocket.recv()
            print(f"📨 Received: {message}")
            print("✅ WebSocket test PASSED!")
            return True
    except Exception as e:
        print(f"❌ WebSocket test FAILED: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(simple_test())
    exit(0 if result else 1)