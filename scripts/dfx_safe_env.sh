#!/usr/bin/env bash
# Shared "safe env" for dfx inside Cursor/CI terminals.
# Goal: avoid the dfx 0.29.x stderr coloring panic (ColorOutOfRange) and avoid interactive prompts.

set -euo pipefail

# Disable colored output in common toolchains
export CLICOLOR=0
export CLICOLOR_FORCE=0
export NO_COLOR=1
unset COLORTERM

# Disable colors in Rust tooling explicitly (covers cargo, env_logger/tracing, etc.)
export CARGO_TERM_COLOR=never
export RUST_LOG_STYLE=never

# Avoid dfx prompts and noisy terminal behavior
export DFX_TELEMETRY_DISABLED=1
# Suppress the mainnet plaintext identity warning prompt (non-interactive safe)
export DFX_WARNING=-mainnet_plaintext_identity

# Give dfx a sane terminal; Cursor sometimes reports odd TERM values.
# We set this explicitly to match the known working workaround for ColorOutOfRange.
export TERM="xterm-256color"

# Helpful when diagnosing any residual crashes
export RUST_BACKTRACE="${RUST_BACKTRACE:-1}"


