# qualia_lints - Build-Time Architectural Enforcement

## Responsibility

Enforces architectural mandates from QUALIA.CODE.RUST at **compile time**. The build WILL FAIL if violations are detected.

---

## Implementation

This crate uses Rust's `build.rs` mechanism to scan the workspace for architectural violations **before compilation**. No external tools or scripts required.

### How It Works

1. Added as a `build-dependency` in crates that need enforcement
2. The `build.rs` script runs automatically on every `cargo build`
3. Scans source files for violations
4. **Exits with code 1** (fails the build) if violations found
5. Zero runtime cost - all checks are build-time only

---

## Implemented Rules

### NO_INLINE_TESTS ✅ ACTIVE

**Enforcement:** `deny` (build failure)

**Rule:** All test code MUST reside in `tests/` directories. No `#[cfg(test)]` modules allowed in `src/`.

**Exceptions:**
- `lib.rs` and `main.rs` (integration test harnesses)
- Files already in `tests/` directories

**Violation Example:**
```
error: Módulo de test inline prohibido por la arquitectura de Qualia Tempo.
  --> shared_core/src/contracts/settings.rs:179:1
   |
   | #[cfg(test)]
   | ^^^^^^^^^^^^ Los tests deben residir en directorios 'tests/' dedicados.
```

---

## Usage

### Integration into a Crate

Add to your `Cargo.toml`:

```toml
[build-dependencies]
qualia_lints = { path = "../qualia_lints" }
```

Create `build.rs` in your crate root:

```rust
fn main() {
    println!("cargo:rerun-if-changed=src");
}
```

**That's it.** The lints will run automatically on every build.

### Testing Enforcement

```bash
# This will FAIL if violations exist
cargo build

# This will PASS only when all violations are fixed
cargo build --release
```

---

## Current Coverage

| Crate | Lint Enforcement | Status |
|-------|-----------------|--------|
| `shared_core` | ✅ Enabled | Failing (6 violations) |
| `backend` | ⏱️ TODO | Not yet integrated |
| `frontend` | ⏱️ TODO | Not yet integrated |

---

## Compliance Matrix

| Rule | Status | Crates | Exit Code |
|------|--------|--------|-----------|
| NO_INLINE_TESTS | ✅ ENFORCED | shared_core | 1 (fails build) |

---

**Affirmative. Build-time enforcement. Zero tolerance.**
