//! # Responsibility
//! Audio system interface trait definitions.
//!
//! ---
//!
//! These traits define the contract for all audio-related services.

use async_trait::async_trait;
use anyhow::Result;
use shaku::Interface;
use std::sync::Arc;
use crate::contracts::HarmonyMap;

/// # Responsibility
/// Caches computed HarmonyMaps to avoid redundant audio analysis.
///
/// ---
///
/// COMPLIANCE: QUALIA.CODE.RUST §1.1 - Performance optimization via caching.
#[async_trait]
pub trait IHarmonyCacheService: Interface + Send + Sync {
    /// Retrieves a cached harmony map by song ID.
    ///
    /// # Returns
    /// `Some(HarmonyMap)` if cached, `None` if cache miss.
    async fn get(&self, song_id: &str) -> Option<Arc<HarmonyMap>>;
    
    /// Stores a harmony map in the cache.
    async fn set(&self, song_id: &str, map: HarmonyMap) -> Result<()>;
    
    /// Invalidates a specific cached entry.
    async fn invalidate(&self, song_id: &str);
    
    /// Clears all cached harmony maps.
    async fn clear(&self);
}
