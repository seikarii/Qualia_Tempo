# QUALIA.CODE v1.1 - ISecurityService Contracts
from dataclasses import dataclass

@dataclass
class SecurityConfig:
    """Configuration contract for SecurityService."""
    enable_auth: bool = True
    token_expiration_minutes: int = 60
    max_login_attempts: int = 5
    rate_limit_per_minute: int = 100
