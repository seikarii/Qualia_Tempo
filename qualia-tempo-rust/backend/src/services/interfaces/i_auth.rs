//! # Responsibility
//! Authentication and authorization service interface.

use shaku::Interface;
use async_trait::async_trait;
use anyhow::Result;
use uuid::Uuid;

/// # Responsibility
/// User role for RBAC.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    Admin,
    Player,
    Guest,
}

/// # Responsibility
/// Session metadata.
#[derive(Debug, Clone)]
pub struct Session {
    pub session_id: Uuid,
    pub user_id: Uuid,
    pub role: Role,
    pub created_at: std::time::Instant,
    pub expires_at: std::time::Instant,
}

/// # Responsibility
/// Manages authentication, JWT tokens, and session management.
///
/// ---
///
/// This service provides:
/// - JWT token encoding/decoding
/// - Password hashing with argon2
/// - Session management with expiration
/// - Token refresh mechanism
/// - Role-based access control (RBAC)
#[async_trait]
pub trait IAuthService: Interface {
    /// Hashes password using argon2.
    ///
    /// # Arguments
    /// * `password` - Plain text password
    ///
    /// # Returns
    /// Hashed password string
    async fn hash_password(&self, password: &str) -> Result<String>;
    
    /// Verifies password against hash.
    ///
    /// # Arguments
    /// * `password` - Plain text password
    /// * `hash` - Argon2 hash to verify against
    ///
    /// # Returns
    /// true if password matches
    async fn verify_password(&self, password: &str, hash: &str) -> Result<bool>;
    
    /// Creates JWT token for user.
    ///
    /// # Arguments
    /// * `user_id` - User UUID
    /// * `role` - User role
    ///
    /// # Returns
    /// JWT token string
    async fn create_token(&self, user_id: Uuid, role: Role) -> Result<String>;
    
    /// Validates and decodes JWT token.
    ///
    /// # Arguments
    /// * `token` - JWT token string
    ///
    /// # Returns
    /// User ID and role
    async fn validate_token(&self, token: &str) -> Result<(Uuid, Role)>;
    
    /// Creates new session.
    ///
    /// # Arguments
    /// * `user_id` - User UUID
    /// * `role` - User role
    ///
    /// # Returns
    /// Session object
    async fn create_session(&self, user_id: Uuid, role: Role) -> Result<Session>;
    
    /// Retrieves session by ID.
    ///
    /// # Arguments
    /// * `session_id` - Session UUID
    ///
    /// # Returns
    /// Session if found and not expired
    async fn get_session(&self, session_id: Uuid) -> Result<Session>;
    
    /// Destroys session.
    ///
    /// # Arguments
    /// * `session_id` - Session UUID
    async fn destroy_session(&self, session_id: Uuid) -> Result<()>;
}
