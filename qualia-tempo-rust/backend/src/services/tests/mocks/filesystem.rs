//! # Responsibility
//! High-fidelity mock for IFileSystemService trait.

use crate::services::interfaces::IFileSystemService;
use anyhow::Result;
use async_trait::async_trait;
use mockall::*;

mock! {
    /// # Responsibility
    /// High-fidelity mock for IFileSystemService, used in unit tests.
    pub FileSystemService {}
    
    #[async_trait]
    impl IFileSystemService for FileSystemService {
        async fn read_file(&self, path: &str) -> Result<String>;
        async fn write_file(&self, path: &str, contents: &str) -> Result<()>;
        async fn file_exists(&self, path: &str) -> bool;
        async fn list_dir(&self, path: &str) -> Result<Vec<String>>;
    }
}
