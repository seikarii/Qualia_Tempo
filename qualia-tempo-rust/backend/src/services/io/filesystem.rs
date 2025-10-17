//! # Responsibility
//! Implements filesystem service for async file I/O operations.
//!
//! ---
//!
//! Provides async file reading/writing with tokio::fs, JSON deserialization,
//! directory listing, and path validation to prevent directory traversal attacks.

use crate::services::interfaces::IFileSystemService;
use anyhow::{Context, Result, bail};
use async_trait::async_trait;
use serde::de::DeserializeOwned;
use shaku::{Component, Interface};
use tokio::fs;
use tracing::{info, warn};

/// # Responsibility
/// Implements IFileSystemService with tokio::fs async I/O and path validation.
#[derive(Component)]
#[shaku(interface = IFileSystemService)]
pub struct FileSystemService {
    base_path: String,
}

impl FileSystemService {
    /// # Responsibility
    /// Creates new FileSystemService with base path for file operations.
    pub fn new(base_path: String) -> Self {
        info!("FileSystemService initialized with base path: {}", base_path);
        Self { base_path }
    }
    
    /// # Responsibility
    /// Validates path to prevent directory traversal attacks.
    fn validate_path(&self, path: &str) -> Result<String> {
        let full_path = format!("{}/{}", self.base_path, path);
        
        // Check for directory traversal attempts
        if path.contains("..") {
            bail!("Path contains directory traversal: {}", path);
        }
        
        Ok(full_path)
    }
}

#[async_trait]
impl IFileSystemService for FileSystemService {
    async fn read_file(&self, path: &str) -> Result<String> {
        let full_path = self.validate_path(path)?;
        
        let contents = fs::read_to_string(&full_path)
            .await
            .context(format!("Failed to read file: {}", full_path))?;
        
        info!("Read file: {} ({} bytes)", path, contents.len());
        
        Ok(contents)
    }
    
    async fn write_file(&self, path: &str, contents: &str) -> Result<()> {
        let full_path = self.validate_path(path)?;
        
        // Create parent directories if they don't exist
        if let Some(parent) = std::path::Path::new(&full_path).parent() {
            fs::create_dir_all(parent)
                .await
                .context("Failed to create parent directories")?;
        }
        
        fs::write(&full_path, contents)
            .await
            .context(format!("Failed to write file: {}", full_path))?;
        
        info!("Wrote file: {} ({} bytes)", path, contents.len());
        
        Ok(())
    }
    
    async fn file_exists(&self, path: &str) -> bool {
        let full_path = match self.validate_path(path) {
            Ok(p) => p,
            Err(_) => return false,
        };
        
        fs::try_exists(&full_path).await.unwrap_or(false)
    }
    
    async fn list_dir(&self, path: &str) -> Result<Vec<String>> {
        let full_path = self.validate_path(path)?;
        
        let mut entries = fs::read_dir(&full_path)
            .await
            .context(format!("Failed to read directory: {}", full_path))?;
        
        let mut result = Vec::new();
        while let Some(entry) = entries.next_entry().await? {
            let file_name = entry.file_name().to_string_lossy().to_string();
            result.push(file_name);
        }
        
        info!("Listed directory: {} ({} entries)", path, result.len());
        
        Ok(result)
    }
}

impl FileSystemService {
    /// # Responsibility
    /// Convenience method for reading and deserializing JSON files.
    /// 
    /// Not part of IFileSystemService trait due to dyn compatibility with generics.
    pub async fn read_json<T: DeserializeOwned>(&self, path: &str) -> Result<T> {
        let contents = self.read_file(path).await?;
        
        let data: T = serde_json::from_str(&contents)
            .context(format!("Failed to deserialize JSON from: {}", path))?;
        
        info!("Deserialized JSON from: {}", path);
        
        Ok(data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use tempfile::tempdir;
    
    #[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
    struct TestData {
        value: i32,
        name: String,
    }
    
    fn create_test_service() -> (FileSystemService, tempfile::TempDir) {
        let temp_dir = tempdir().unwrap();
        let base_path = temp_dir.path().to_string_lossy().to_string();
        let service = FileSystemService::new(base_path);
        (service, temp_dir)
    }
    
    #[tokio::test]
    async fn test_read_file_success() {
        let (service, _temp_dir) = create_test_service();
        
        service.write_file("test.txt", "Hello, World!").await.unwrap();
        let contents = service.read_file("test.txt").await.unwrap();
        
        assert_eq!(contents, "Hello, World!");
    }
    
    #[tokio::test]
    async fn test_read_file_not_found() {
        let (service, _temp_dir) = create_test_service();
        
        let result = service.read_file("nonexistent.txt").await;
        
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_write_file_creates_new() {
        let (service, _temp_dir) = create_test_service();
        
        service.write_file("new_file.txt", "Content").await.unwrap();
        
        assert!(service.file_exists("new_file.txt").await);
    }
    
    #[tokio::test]
    async fn test_read_json_deserialize_correct() {
        let (service, _temp_dir) = create_test_service();
        
        let data = TestData { value: 42, name: "Test".to_string() };
        let json = serde_json::to_string(&data).unwrap();
        service.write_file("data.json", &json).await.unwrap();
        
        let loaded: TestData = service.read_json("data.json").await.unwrap();
        
        assert_eq!(loaded, data);
    }
    
    #[tokio::test]
    async fn test_read_json_malformed_error() {
        let (service, _temp_dir) = create_test_service();
        
        service.write_file("bad.json", "{invalid json}").await.unwrap();
        
        let result: Result<TestData> = service.read_json("bad.json").await;
        
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_file_exists_true() {
        let (service, _temp_dir) = create_test_service();
        
        service.write_file("exists.txt", "Content").await.unwrap();
        
        assert!(service.file_exists("exists.txt").await);
    }
    
    #[tokio::test]
    async fn test_file_exists_false() {
        let (service, _temp_dir) = create_test_service();
        
        assert!(!service.file_exists("missing.txt").await);
    }
    
    #[tokio::test]
    async fn test_list_dir_returns_entries() {
        let (service, _temp_dir) = create_test_service();
        
        service.write_file("dir/file1.txt", "A").await.unwrap();
        service.write_file("dir/file2.txt", "B").await.unwrap();
        
        let entries = service.list_dir("dir").await.unwrap();
        
        assert_eq!(entries.len(), 2);
        assert!(entries.contains(&"file1.txt".to_string()));
        assert!(entries.contains(&"file2.txt".to_string()));
    }
}
