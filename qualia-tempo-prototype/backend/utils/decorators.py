# QUALIA.CODE v1.0 - Backend Decorators
# Mandatory transversal logic implementation

import functools
import logging
import time
import traceback
from typing import Any, Callable, Dict, Optional
import jsonschema
import json


def log_execution(level: str = "INFO") -> Callable[[Callable], Callable]:
    """
    Decorator to log function entry, exit, and execution time.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger = logging.getLogger(func.__module__)
            log_level = getattr(logging, level.upper())

            start_time = time.time()
            func_name = f"{func.__module__}.{func.__qualname__}"

            logger.log(log_level, f"→ ENTER {func_name}")

            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                logger.log(log_level, f"← EXIT {func_name} (⏱️ {execution_time:.3f}s)")
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"✗ ERROR {func_name} (⏱️ {execution_time:.3f}s): {str(e)}")
                raise

        return wrapper

    return decorator


def handle_errors(fallback_return_value: Any = None) -> Callable[[Callable], Callable]:
    """
    Decorator to wrap function in try/except block and log errors.

    Args:
        fallback_return_value: Value to return if an error occurs
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger = logging.getLogger(func.__module__)
            func_name = f"{func.__module__}.{func.__qualname__}"

            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"🚨 ERROR in {func_name}: {str(e)}")
                logger.error(f"📍 Traceback: {traceback.format_exc()}")
                logger.error(f"📋 Args: {args}")
                logger.error(f"📋 Kwargs: {kwargs}")

                if fallback_return_value is not None:
                    logger.warning(
                        f"🔄 Returning fallback value: {fallback_return_value}"
                    )
                    return fallback_return_value
                else:
                    logger.error("💥 Re-raising exception")
                    raise

        return wrapper

    return decorator


def validate_schema(schema_name: str) -> Callable[[Callable], Callable]:
    """
    Decorator to validate input against a shared contract schema.

    Args:
        schema_name: Name of the schema to validate against (e.g., "QualiaState")
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger = logging.getLogger(func.__module__)
            func_name = f"{func.__module__}.{func.__qualname__}"

            # Load the schema
            try:
                schema_path = f"/media/seikarii/Nvme/QualiaTempo/shared_contracts/{schema_name}.json"
                with open(schema_path, "r") as f:
                    schema = json.load(f)
            except FileNotFoundError:
                logger.error(f"🚨 Schema not found: {schema_path}")
                raise ValueError(f"Schema {schema_name} not found")
            except json.JSONDecodeError as e:
                logger.error(f"🚨 Invalid JSON in schema {schema_name}: {e}")
                raise ValueError(f"Invalid schema {schema_name}")

            # Validate the first argument (assumed to be the data to validate)
            if args:
                data_to_validate = args[0]
                if hasattr(data_to_validate, "dict"):
                    # Pydantic model
                    data_dict = data_to_validate.dict()
                elif isinstance(data_to_validate, dict):
                    data_dict = data_to_validate
                else:
                    logger.warning(
                        f"⚠️  Cannot validate type {type(data_to_validate)} in {func_name}"
                    )
                    return func(*args, **kwargs)

                try:
                    jsonschema.validate(data_dict, schema)
                    logger.debug(
                        f"✅ Schema validation passed for {schema_name} in {func_name}"
                    )
                except jsonschema.ValidationError as e:
                    logger.error(
                        f"🚨 Schema validation failed for {schema_name} in {func_name}: {e.message}"
                    )
                    raise ValueError(f"Schema validation failed: {e.message}")

            return func(*args, **kwargs)

        return wrapper

    return decorator


def time_execution() -> Callable[[Callable], Callable]:
    """
    Decorator to measure and log execution time with performance categorization.
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger = logging.getLogger(func.__module__)
            func_name = f"{func.__module__}.{func.__qualname__}"

            start_time = time.time()
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time

            # Performance categorization
            if execution_time < 0.001:
                perf_category = "🚀 FAST"
                log_level = logging.DEBUG
            elif execution_time < 0.01:
                perf_category = "⚡ GOOD"
                log_level = logging.DEBUG
            elif execution_time < 0.1:
                perf_category = "⏱️  OK"
                log_level = logging.INFO
            elif execution_time < 1.0:
                perf_category = "🐌 SLOW"
                log_level = logging.WARNING
            else:
                perf_category = "🚨 VERY SLOW"
                log_level = logging.ERROR

            logger.log(log_level, f"{perf_category} {func_name}: {execution_time:.4f}s")

            return result

        return wrapper

    return decorator


def cache_result(ttl_seconds: Optional[int] = None) -> Callable[[Callable], Callable]:
    """
    Decorator to cache function results with optional TTL.

    Args:
        ttl_seconds: Time to live for cached results. None means cache forever.
    """
    cache: Dict[str, Dict[str, Any]] = {}

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Create cache key from function name and arguments
            cache_key = f"{func.__module__}.{func.__qualname__}:{hash(str(args) + str(sorted(kwargs.items())))}"

            current_time = time.time()

            # Check if we have a cached result
            if cache_key in cache:
                cached_data = cache[cache_key]

                # Check TTL if specified
                if (
                    ttl_seconds is None
                    or (current_time - cached_data["timestamp"]) < ttl_seconds
                ):
                    logger = logging.getLogger(func.__module__)
                    logger.debug(f"💾 Cache HIT for {func.__qualname__}")
                    return cached_data["result"]
                else:
                    # TTL expired, remove from cache
                    del cache[cache_key]

            # Execute function and cache result
            result = func(*args, **kwargs)
            cache[cache_key] = {"result": result, "timestamp": current_time}

            logger = logging.getLogger(func.__module__)
            logger.debug(f"🔄 Cache MISS for {func.__qualname__}")

            return result

        return wrapper

    return decorator
