#!/usr/bin/env python3
import requests
import websockets
import asyncio
import sys

def test_http():
    try:
        response = requests.get("http://127.0.0.1:8000/docs", timeout=5)
        print(f"HTTP Status: {response.status_code}")
        print("HTTP connection successful!")
        return True
    except Exception as e:
        print(f"HTTP Error: {e}")
        return False

async def test_websocket():
    try:
        uri = "ws://127.0.0.1:8000/ws/test"
        print(f"Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("WebSocket Connected!")
            message = await websocket.recv()
            print(f"Received: {message}")
            print("WebSocket test successful!")
            return True
    except Exception as e:
        print(f"WebSocket Error: {e}")
        return False

if __name__ == "__main__":
    print("Testing HTTP connection...")
    http_ok = test_http()

    if http_ok:
        print("\nTesting WebSocket connection...")
        ws_ok = asyncio.run(test_websocket())

        if ws_ok:
            print("\n✅ All tests passed!")
            sys.exit(0)
        else:
            print("\n❌ WebSocket test failed!")
            sys.exit(1)
    else:
        print("\n❌ HTTP test failed!")
        sys.exit(1)