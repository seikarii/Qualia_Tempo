//! # Responsibility
//! Integration tests for audio contract serialization.
//!
//! ---
//!
//! Validates JSON serialization/deserialization of HarmonyMap and
//! InstrumentPatch structs for dynamic audio generation.

use shared_core::contracts::{
    HarmonicContext, HarmonyMap, InstrumentPatch, PatchType, TimeSignature,
};

#[test]
fn test_harmony_map_serialization() {
    let map = HarmonyMap {
        song_id: "test_song".to_string(),
        key_signature: "C Major".to_string(),
        time_signature: TimeSignature {
            numerator: 4,
            denominator: 4,
        },
        progression: vec![
            HarmonicContext {
                start_time_sec: 0.0,
                end_time_sec: 4.0,
                chord: "C".to_string(),
                scale: vec!["C".to_string(), "D".to_string(), "E".to_string()],
            },
        ],
    };

    let json = serde_json::to_string(&map).expect("Failed to serialize");
    assert!(json.contains("test_song"));
    assert!(json.contains("C Major"));

    let deserialized: HarmonyMap = serde_json::from_str(&json)
        .expect("Failed to deserialize");
    assert_eq!(deserialized, map);
}

#[test]
fn test_instrument_patch_serialization() {
    let patch = InstrumentPatch {
        id: "crystal_bell".to_string(),
        name: "Crystal Bell".to_string(),
        patch_type: PatchType::Sampler {
            sample_map_url: "samples/bell.json".to_string(),
        },
    };

    let json = serde_json::to_string(&patch).expect("Failed to serialize");
    assert!(json.contains("crystal_bell"));
    assert!(json.contains("sampler"));

    let deserialized: InstrumentPatch = serde_json::from_str(&json)
        .expect("Failed to deserialize");
    assert_eq!(deserialized, patch);
}
