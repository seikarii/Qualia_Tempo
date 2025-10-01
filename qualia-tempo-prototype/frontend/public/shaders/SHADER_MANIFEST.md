# SHADER MANIFEST

This document lists all active shader files (.glsl, .vert) used in the post-processing pipeline and the rendering pass that utilizes them.

## Active Shaders

### G-Buffer Pipeline
- **gbuffer.glsl**: Used in GBufferPass for generating geometry buffer textures (color, normal, depth, material)

### SSR Pipeline
- **ssr_v2.glsl**: Used in ShaderPass for screen-space reflections calculation

### Composite Pipeline
- **composite_pass.glsl**: Used in ShaderPass for final image composition combining base color with reflections
- **UnrealBloomPass**: Three.js built-in bloom effect for enhanced visual flair (now enabled)

### Shared Vertex Shaders
- **fullscreen_quad.vert**: Vertex shader for full-screen quad rendering (used by various ShaderPasses)

## Pipeline Overview

1. **gbuffer_pipeline**: Generates G-Buffer textures
2. **ssr_pipeline**: Computes screen-space reflections using G-Buffer
3. **composite_pipeline**: Combines base rendering with reflections and applies bloom effect for final output

## Notes

- All shaders are loaded dynamically via ShaderLoaderService based on post-processing.yaml configuration
- Shaders are introspected using ShaderIntrospectionService for uniform and attribute detection
- Vertex and fragment shaders are combined in .glsl files or use shared .vert files