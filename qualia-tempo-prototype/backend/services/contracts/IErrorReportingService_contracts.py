# QUALIA.CODE v1.1 - IErrorReportingService Contracts
from dataclasses import dataclass

@dataclass
class ErrorReportingConfig:
    """Configuration contract for ErrorReportingService."""
    enable_reporting: bool = True
    max_error_history: int = 1000
    report_to_console: bool = True
    report_to_file: bool = True
    error_log_path: str = "errors.log"
