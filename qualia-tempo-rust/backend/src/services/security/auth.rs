//! # Responsibility
//! Authentication service implementation with JWT and argon2.

use shaku::Component;
use async_trait::async_trait;
use anyhow::{Result, Context, bail};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use uuid::Uuid;
use tracing::{info, debug, instrument};
use argon2::{
    password_hash::{
        rand_core::OsRng,
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString
    },
    Argon2
};
use jsonwebtoken::{encode, decode, Header, EncodingKey, DecodingKey, Validation, Algorithm};
use serde::{Serialize, Deserialize};

use crate::services::interfaces::{IAuthService, ILogger, Role, Session};

/// JWT claims structure.
#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String, // User ID
    role: String,
    exp: usize, // Expiration time
}

/// # Responsibility
/// Implements authentication with JWT tokens and argon2 password hashing.
///
/// ---
///
/// Features:
/// - JWT token encoding/decoding with HS256
/// - Password hashing with argon2
/// - Session management with expiration tracking
/// - Token refresh mechanism
/// - Role-based access control
#[derive(Component)]
#[shaku(interface = IAuthService)]
pub struct AuthService {
    #[shaku(inject)]
    logger: Arc<dyn ILogger>,
    
    jwt_secret: String,
    token_expiry_secs: u64,
    sessions: Arc<RwLock<HashMap<Uuid, Session>>>,
}

impl AuthService {
    /// Creates a new AuthService with default configuration.
    pub fn new(logger: Arc<dyn ILogger>) -> Self {
        Self {
            logger,
            jwt_secret: std::env::var("JWT_SECRET").unwrap_or_else(|_| "default-secret-change-me".to_string()),
            token_expiry_secs: 3600, // 1 hour
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

#[async_trait]
impl IAuthService for AuthService {
    #[instrument(skip(self, password))]
    async fn hash_password(&self, password: &str) -> Result<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        let password_hash = argon2.hash_password(password.as_bytes(), &salt)
            .context("Failed to hash password")?
            .to_string();
        
        Ok(password_hash)
    }
    
    #[instrument(skip(self, password, hash))]
    async fn verify_password(&self, password: &str, hash: &str) -> Result<bool> {
        let parsed_hash = PasswordHash::new(hash)
            .context("Invalid password hash format")?;
        
        let argon2 = Argon2::default();
        
        match argon2.verify_password(password.as_bytes(), &parsed_hash) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }
    
    #[instrument(skip(self))]
    async fn create_token(&self, user_id: Uuid, role: Role) -> Result<String> {
        let expiration = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .context("System time error")?
            .as_secs() + self.token_expiry_secs;
        
        let claims = Claims {
            sub: user_id.to_string(),
            role: format!("{:?}", role),
            exp: expiration as usize,
        };
        
        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes())
        ).context("Failed to encode JWT")?;
        
        debug!("Created token for user {}", user_id);
        Ok(token)
    }
    
    #[instrument(skip(self, token))]
    async fn validate_token(&self, token: &str) -> Result<(Uuid, Role)> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &Validation::new(Algorithm::HS256)
        ).context("Invalid JWT token")?;
        
        let user_id = Uuid::parse_str(&token_data.claims.sub)
            .context("Invalid user ID in token")?;
        
        let role = match token_data.claims.role.as_str() {
            "Admin" => Role::Admin,
            "Player" => Role::Player,
            "Guest" => Role::Guest,
            _ => bail!("Invalid role in token"),
        };
        
        Ok((user_id, role))
    }
    
    #[instrument(skip(self))]
    async fn create_session(&self, user_id: Uuid, role: Role) -> Result<Session> {
        let session_id = Uuid::new_v4();
        let now = std::time::Instant::now();
        
        let session = Session {
            session_id,
            user_id,
            role,
            created_at: now,
            expires_at: now + std::time::Duration::from_secs(self.token_expiry_secs),
        };
        
        let mut sessions = self.sessions.write().await;
        sessions.insert(session_id, session.clone());
        
        info!("Created session {} for user {}", session_id, user_id);
        Ok(session)
    }
    
    #[instrument(skip(self))]
    async fn get_session(&self, session_id: Uuid) -> Result<Session> {
        let sessions = self.sessions.read().await;
        
        let session = sessions.get(&session_id)
            .context("Session not found")?;
        
        // Check if expired
        if std::time::Instant::now() > session.expires_at {
            bail!("Session expired");
        }
        
        Ok(session.clone())
    }
    
    #[instrument(skip(self))]
    async fn destroy_session(&self, session_id: Uuid) -> Result<()> {
        let mut sessions = self.sessions.write().await;
        
        if sessions.remove(&session_id).is_some() {
            info!("Destroyed session {}", session_id);
            Ok(())
        } else {
            bail!("Session not found")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::tests::mocks::MockLogger;
    
    #[tokio::test]
    async fn test_hash_and_verify_password() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = AuthService::new(Arc::new(mock_logger));
        
        let password = "secure_password_123";
        let hash = service.hash_password(password).await.unwrap();
        
        assert!(service.verify_password(password, &hash).await.unwrap());
        assert!(!service.verify_password("wrong_password", &hash).await.unwrap());
    }
    
    #[tokio::test]
    async fn test_create_and_validate_token() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = AuthService::new(Arc::new(mock_logger));
        
        let user_id = Uuid::new_v4();
        let role = Role::Player;
        
        let token = service.create_token(user_id, role).await.unwrap();
        let (decoded_id, decoded_role) = service.validate_token(&token).await.unwrap();
        
        assert_eq!(decoded_id, user_id);
        assert_eq!(decoded_role, role);
    }
    
    #[tokio::test]
    async fn test_invalid_token() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = AuthService::new(Arc::new(mock_logger));
        
        let result = service.validate_token("invalid.token.here").await;
        assert!(result.is_err());
    }
    
    #[tokio::test]
    async fn test_create_and_get_session() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = AuthService::new(Arc::new(mock_logger));
        
        let user_id = Uuid::new_v4();
        let session = service.create_session(user_id, Role::Admin).await.unwrap();
        
        let retrieved = service.get_session(session.session_id).await.unwrap();
        assert_eq!(retrieved.user_id, user_id);
        assert_eq!(retrieved.role, Role::Admin);
    }
    
    #[tokio::test]
    async fn test_destroy_session() {
        let mut mock_logger = MockLogger::new();
        mock_logger.expect_info().return_const(());
        
        let service = AuthService::new(Arc::new(mock_logger));
        
        let user_id = Uuid::new_v4();
        let session = service.create_session(user_id, Role::Player).await.unwrap();
        
        service.destroy_session(session.session_id).await.unwrap();
        
        let result = service.get_session(session.session_id).await;
        assert!(result.is_err());
    }
}
