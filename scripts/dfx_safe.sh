#!/bin/bash
# Wrapper script to execute dfx commands with safe environment variables
source "$(dirname "$0")/dfx_safe_env.sh"
dfx "$@"
