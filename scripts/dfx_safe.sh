#!/usr/bin/env bash
# Wrapper for dfx that applies scripts/dfx_safe_env.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${SCRIPT_DIR}/dfx_safe_env.sh"

exec dfx "$@"


