"""
Common data structures and constants for the reality engine.
"""
import numpy as np

# --- NumPy dtypes for GLSL structs ---
# LivingEntity struct: 80 bytes (20 floats)
LIVING_ENTITY_DTYPE = np.dtype(
    [
        ("position_x", "f4"),
        ("position_y", "f4"),
        ("position_z", "f4"),
        ("consciousness_level", "f4"),
        ("velocity_x", "f4"),
        ("velocity_y", "f4"),
        ("velocity_z", "f4"),
        ("ontological_drift", "f4"),
        ("qualia_state_intensity", "f4"),
        ("qualia_state_precision", "f4"),
        ("qualia_state_aggression", "f4"),
        ("qualia_state_flow", "f4"),
        ("qualia_state_chaos", "f4"),
        ("qualia_state_recovery", "f4"),
        ("qualia_state_transcendence", "f4"),
        ("lifecycle_stage", "f4"),
        ("empathetic_resonance", "f4"),
        ("chaos_influence", "f4"),
        ("entity_id", "u4"),
        ("is_active", "u4"),
        ("padding", "f4"), # Padding to make total size 96 bytes (24 floats * 4 bytes/float)
    ]
)

# LatticePoint struct: 64 bytes (16 floats)
LATTICE_POINT_DTYPE = np.dtype(
    [
        ("position_x", "f4"),
        ("position_y", "f4"),
        ("position_z", "f4"),
        ("influence_strength", "f4"),
        ("elemental_composition_x", "f4"),
        ("elemental_composition_y", "f4"),
        ("elemental_composition_z", "f4"),
        ("elemental_composition_w", "f4"),
        ("metaphysical_state_x", "f4"),
        ("metaphysical_state_y", "f4"),
        ("metaphysical_state_z", "f4"),
        ("metaphysical_state_w", "f4"),
        ("coherence_level", "f4"),
        ("lattice_type", "u4"),
        ("padding1", "f4"),
        ("padding2", "f4"),
    ]
)

# Particle struct
PARTICLE_DTYPE = np.dtype(
    [
        ("position_x", "f4"),
        ("position_y", "f4"),
        ("position_z", "f4"),
        ("velocity_x", "f4"),
        ("velocity_y", "f4"),
        ("velocity_z", "f4"),
        ("color_r", "f4"),
        ("color_g", "f4"),
        ("color_b", "f4"),
        ("lifetime", "f4"),  # Current lifetime (decreases)
        ("max_lifetime", "f4"),  # Initial lifetime
        ("size", "f4"),
        ("type", "u4"),  # e.g., 0=aura, 1=explosion, 2=trail
        ("active", "u4"),  # 1 if active, 0 if inactive
        ("padding1", "f4"),
        ("padding2", "f4"),
    ]
)
