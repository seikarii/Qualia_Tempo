# API Module

## Overview
The API module handles all HTTP requests and responses for the Qualia Tempo backend. It provides RESTful endpoints for game state management and communication with the frontend.

## Endpoints

### `POST /update_qualia`
Updates the game's QualiaState based on player actions.

**Request Body:**
```json
{
  "intensity": 0.0,
  "precision": 0.0,
  "aggression": 0.0,
  "flow": 0.0,
  "chaos": 0.0,
  "recovery": 0.0,
  "transcendence": 0.0
}
```

**Response:**
```json
{
  "status": "success",
  "visual_effects": {
    "shader_params": {},
    "particle_effects": [],
    "post_processing": {}
  }
}
```

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-09-08T04:10:00Z"
}
```

## Error Handling

All error responses follow this format:
```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes
- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Authentication required
- `404`: Not Found - Resource not found
- `422`: Validation Error - Request validation failed
- `500`: Internal Server Error - Server-side error

## Rate Limiting

API requests are rate limited to prevent abuse. The current limits are:
- 1000 requests per minute per IP address
- 10000 requests per hour per API key

## Authentication

Protected endpoints require an API key in the `X-API-Key` header.

## Versioning

API versioning is handled through the URL path:
- `/v1/` - Current stable version
- `/beta/` - Preview of upcoming features

## Testing

Run API tests with:
```bash
pytest tests/api/
```

## Documentation

Interactive API documentation is available at `/docs` when running in development mode.
