//! # Responsibility
//! Filesystem service interface for async file I/O.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;
use serde::de::DeserializeOwned;

/// # Responsibility
/// Manages async file I/O with tokio::fs.
#[async_trait]
pub trait IFileSystemService: Interface {
    /// Reads file contents as string.
    async fn read_file(&self, path: &str) -> Result<String>;
    
    /// Writes string to file.
    async fn write_file(&self, path: &str, contents: &str) -> Result<()>;
    
    /// Reads and deserializes JSON file.
    async fn read_json<T: DeserializeOwned>(&self, path: &str) -> Result<T>;
    
    /// Checks if file exists.
    async fn file_exists(&self, path: &str) -> bool;
    
    /// Lists files in directory.
    async fn list_dir(&self, path: &str) -> Result<Vec<String>>;
}
