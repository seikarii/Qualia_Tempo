#!/usr/bin/env python3
"""
Stress test for WebSocket connection cycling to validate
StreamingWebService lifecycle robustness per QT-BACKEND-20250920-002
"""

import asyncio
import websockets
import json
import time
import sys

async def stress_test_websocket():
    """Perform rapid connect/disconnect cycles to test lifecycle robustness."""
    url = "ws://localhost:8000/ws/video_stream"
    cycles = 10
    interval = 0.5  # 500ms between cycles
    
    print(f"🧪 Starting WebSocket stress test: {cycles} cycles every {interval}s")
    print(f"Target: {url}")
    
    for i in range(cycles):
        print(f"\n📡 Cycle {i+1}/{cycles}")
        try:
            # Connect
            print("  🔗 Connecting...")
            websocket = await websockets.connect(url)
            print("  ✅ Connected")
            
            # Send a ping to verify communication
            ping_msg = {
                "type": "ping",
                "timestamp": time.time(),
                "pingId": f"stress_test_{i}"
            }
            await websocket.send(json.dumps(ping_msg))
            print("  📤 Ping sent")
            
            # Wait for a response or timeout
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                data = json.loads(response)
                if data.get("type") == "pong":
                    print("  📥 Pong received")
                else:
                    print(f"  📥 Other message: {data.get('type')}")
            except asyncio.TimeoutError:
                print("  ⏰ No response received (timeout)")
            
            # Disconnect
            print("  🔌 Disconnecting...")
            await websocket.close()
            print("  ✅ Disconnected")
            
        except Exception as e:
            print(f"  ❌ Error in cycle {i+1}: {e}")
        
        # Wait before next cycle
        if i < cycles - 1:
            print(f"  ⏳ Waiting {interval}s...")
            await asyncio.sleep(interval)
    
    print(f"\n🏁 Stress test complete: {cycles} cycles finished")

if __name__ == "__main__":
    try:
        asyncio.run(stress_test_websocket())
    except KeyboardInterrupt:
        print("\n⚡ Stress test interrupted by user")
    except Exception as e:
        print(f"\n💥 Stress test failed: {e}")
        sys.exit(1)
