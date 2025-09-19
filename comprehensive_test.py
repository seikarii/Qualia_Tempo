#!/usr/bin/env python3
import subprocess
import time
import signal
import os
import sys
import requests
import websockets
import asyncio

def start_backend():
    """Start the backend server as a subprocess."""
    print("Starting backend server...")
    env = os.environ.copy()
    env['PATH'] = '/media/seikarii/Nvme/QualiaTempo/.venv/bin:' + env['PATH']

    process = subprocess.Popen(
        ['python3', 'backend/main.py'],
        cwd='/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype',
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid
    )
    return process

def test_http():
    """Test HTTP connection."""
    try:
        response = requests.get("http://127.0.0.1:8000/docs", timeout=5)
        print(f"✅ HTTP Status: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ HTTP Error: {e}")
        return False

async def test_websocket():
    """Test WebSocket connection."""
    try:
        uri = "ws://127.0.0.1:8000/ws/test"
        print(f"🔌 Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket Connected!")
            message = await websocket.recv()
            print(f"📨 Received: {message}")
            print("✅ WebSocket test successful!")
            return True
    except Exception as e:
        print(f"❌ WebSocket Error: {e}")
        return False

def main():
    # Start backend server
    backend_process = start_backend()

    # Wait for server to start
    print("Waiting for server to initialize...")
    time.sleep(10)

    try:
        # Test HTTP connection
        print("\n=== Testing HTTP Connection ===")
        http_ok = test_http()

        # Test WebSocket connection
        print("\n=== Testing WebSocket Connection ===")
        ws_ok = asyncio.run(test_websocket())

        if http_ok and ws_ok:
            print("\n🎉 ALL TESTS PASSED!")
            return 0
        else:
            print("\n💥 SOME TESTS FAILED!")
            return 1

    finally:
        # Clean up backend process
        print("\n🧹 Shutting down backend server...")
        try:
            os.killpg(os.getpgid(backend_process.pid), signal.SIGTERM)
            backend_process.wait(timeout=5)
        except:
            backend_process.kill()

if __name__ == "__main__":
    sys.exit(main())