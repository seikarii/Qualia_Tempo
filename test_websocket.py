#!/usr/bin/env python3
import asyncio
import websockets
import sys

async def test_websocket():
    try:
        uri = "ws://127.0.0.1:8000/ws/test"
        print(f"Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            message = await websocket.recv()
            print(f"Received: {message}")
            print("Test successful!")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_websocket())