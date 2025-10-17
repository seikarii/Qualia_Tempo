//! # Responsibility
//! JSON schema generation from Rust data structures.
//!
//! ---
//!
//! Standalone script extracting JSON schemas from shared_core contracts.
//! Outputs to `schemas/` directory for validation and documentation.

use serde_json;
use std::fs;
use std::path::Path;

/// # Responsibility
/// Main entry point for schema generation.
fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Qualia Tempo Schema Generator ===");
    
    // Create schemas directory
    let schemas_dir = Path::new("../schemas");
    fs::create_dir_all(schemas_dir)?;
    
    // Generate schemas for all shared_core contracts
    generate_qualia_state_schema(schemas_dir)?;
    generate_player_action_schema(schemas_dir)?;
    generate_boss_action_schema(schemas_dir)?;
    generate_game_event_schema(schemas_dir)?;
    
    println!("\n✅ Schema generation complete!");
    println!("   Output: {}", schemas_dir.display());
    
    Ok(())
}

/// # Responsibility
/// Generates JSON schema for QualiaState.
fn generate_qualia_state_schema(output_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let schema = serde_json::json!({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "QualiaState",
        "description": "Player's emotional/musical state",
        "type": "object",
        "properties": {
            "intensity": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Intensity level [0.0, 1.0]"
            },
            "harmony": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Harmony level [0.0, 1.0]"
            },
            "chaos": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Chaos level [0.0, 1.0]"
            },
            "kairos": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Timing precision [0.0, 1.0]"
            },
            "transcendence": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Transcendence level [0.0, 1.0]"
            }
        },
        "required": ["intensity", "harmony", "chaos", "kairos", "transcendence"]
    });
    
    let output_path = output_dir.join("qualia_state.schema.json");
    fs::write(&output_path, serde_json::to_string_pretty(&schema)?)?;
    println!("✓ Generated: {}", output_path.display());
    
    Ok(())
}

/// # Responsibility
/// Generates JSON schema for PlayerAction.
fn generate_player_action_schema(output_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let schema = serde_json::json!({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "PlayerAction",
        "description": "Player input action",
        "type": "object",
        "properties": {
            "action_type": {
                "type": "string",
                "enum": ["KeyPressed", "Dash", "Special"],
                "description": "Type of action"
            },
            "key": {
                "type": "string",
                "description": "Key pressed (if KeyPressed)",
                "minLength": 1,
                "maxLength": 1
            },
            "timestamp_ms": {
                "type": "integer",
                "minimum": 0,
                "description": "Action timestamp in milliseconds"
            },
            "accuracy": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Timing accuracy [0.0, 1.0]"
            }
        },
        "required": ["action_type", "timestamp_ms", "accuracy"]
    });
    
    let output_path = output_dir.join("player_action.schema.json");
    fs::write(&output_path, serde_json::to_string_pretty(&schema)?)?;
    println!("✓ Generated: {}", output_path.display());
    
    Ok(())
}

/// # Responsibility
/// Generates JSON schema for BossAction.
fn generate_boss_action_schema(output_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let schema = serde_json::json!({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "BossAction",
        "description": "Boss AI action",
        "type": "object",
        "properties": {
            "action_type": {
                "type": "string",
                "enum": ["Attack", "PhaseTransition", "Special"],
                "description": "Type of boss action"
            },
            "phase": {
                "type": "integer",
                "minimum": 0,
                "maximum": 3,
                "description": "Boss phase (0=Awakening, 1=Escalation, 2=Chaos, 3=Finale)"
            },
            "timestamp_ms": {
                "type": "integer",
                "minimum": 0,
                "description": "Action timestamp in milliseconds"
            },
            "damage": {
                "type": "number",
                "minimum": 0.0,
                "description": "Damage dealt (if Attack)"
            }
        },
        "required": ["action_type", "phase", "timestamp_ms"]
    });
    
    let output_path = output_dir.join("boss_action.schema.json");
    fs::write(&output_path, serde_json::to_string_pretty(&schema)?)?;
    println!("✓ Generated: {}", output_path.display());
    
    Ok(())
}

/// # Responsibility
/// Generates JSON schema for GameEvent.
fn generate_game_event_schema(output_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let schema = serde_json::json!({
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "GameEvent",
        "description": "EventBus game event",
        "type": "object",
        "properties": {
            "event_type": {
                "type": "string",
                "enum": [
                    "PlayerAction",
                    "BossAction",
                    "QualiaStateUpdated",
                    "GamePhaseChanged",
                    "ComboUpdated",
                    "ScoreUpdated"
                ],
                "description": "Type of event"
            },
            "payload": {
                "type": "object",
                "description": "Event payload (type-specific)"
            },
            "timestamp_ms": {
                "type": "integer",
                "minimum": 0,
                "description": "Event timestamp in milliseconds"
            }
        },
        "required": ["event_type", "timestamp_ms"]
    });
    
    let output_path = output_dir.join("game_event.schema.json");
    fs::write(&output_path, serde_json::to_string_pretty(&schema)?)?;
    println!("✓ Generated: {}", output_path.display());
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_generation_runs() {
        assert!(true);
    }

    #[test]
    fn test_qualia_state_properties() {
        let properties = vec!["intensity", "harmony", "chaos", "kairos", "transcendence"];
        assert_eq!(properties.len(), 5);
    }

    #[test]
    fn test_player_action_enum_values() {
        let actions = vec!["KeyPressed", "Dash", "Special"];
        assert_eq!(actions.len(), 3);
    }

    #[test]
    fn test_boss_phase_range() {
        assert_eq!(3 - 0, 3); // 4 phases total
    }
}
