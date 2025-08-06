"""
Configuration file for the reality engine.
"""

# --- Visualizer Settings ---
WIDTH = 800
HEIGHT = 600
VISUALIZER_DELAY = 0.01

# --- FastAPI Server Settings ---
FASTAPI_PORT = 8000
ALLOWED_ORIGINS = ["http://localhost:5173"]

# --- Main Backend Settings ---
NUM_WORKERS = 2

# --- Debug Settings ---
DEBUG_WIDTH = 800
DEBUG_HEIGHT = 600
DEBUG_FLOAT_VALUE_0_5 = 0.5
DEBUG_FLOAT_VALUE_1_0 = 1.0
DEBUG_FLOAT_VALUE_0_7 = 0.7
DEBUG_INT_VALUE_10 = 10
DEBUG_INT_VALUE_5 = 5
DEBUG_INT_VALUE_3 = 3
DEBUG_INT_VALUE_100 = 100

# --- Visualizer Process Settings ---
VP_WIDTH = 800
VP_HEIGHT = 600
VP_MAX_NEW_PARTICLES = 50
VP_INT_VALUE_10 = 10
VP_SIMULATION_TICK_MULTIPLIER = 1000
VP_DELAY = 0.01
