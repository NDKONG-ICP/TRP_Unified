#!/bin/bash
# Safe environment variables to prevent dfx color-related panics
export CLICOLOR=0
export DFX_TELEMETRY_DISABLED=1
export RUST_BACKTRACE=1
export TERM="xterm-256color"
export NO_COLOR=1
export DFX_WARNING=-mainnet_plaintext_identity
