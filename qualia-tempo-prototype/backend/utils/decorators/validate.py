# QUALIA.CODE v1.1 - Schema Validation Decorator
# Phase 3.5: Decorator Modularization

import functools
import logging
import json
from typing import Any, Callable
import jsonschema


def validate_schema(schema_name: str) -> Callable[[Callable], Callable]:
    """
    Decorator to validate input against a shared contract schema.

    Args:
        schema_name: Name of the schema to validate against (e.g., "QualiaState")
    
    Usage:
        @validate_schema("QualiaState")
        def process_qualia(self, state: QualiaState) -> None:
            # Method implementation
            pass
    
    Benefits:
        - Automatic schema validation
        - Data integrity enforcement
        - Contract compliance verification
        - Early error detection
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
                logger.error(f"�� Invalid JSON in schema {schema_name}: {e}")
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
