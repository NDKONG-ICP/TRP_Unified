#!/usr/bin/env bash
#
# Configure RavenAI mainnet keys WITHOUT committing secrets.
# Usage:
#   export RAVEN_AI_HUGGINGFACE_API_KEY="hf_..."
#   export RAVEN_AI_PERPLEXITY_API_KEY="pplx-..."   # or pplx_ depending on your key format
#   export RAVEN_AI_ELEVENLABS_API_KEY="sk_..."
#   ./scripts/configure_raven_ai_keys_mainnet.sh
#
# Notes:
# - Requires you to be authenticated as an admin principal in the raven_ai canister config.
# - Does not print keys; only prints readiness status after setting.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DFX="./scripts/dfx_safe.sh"

need_env() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "Missing env var: $name" >&2
    exit 1
  fi
}

need_env "RAVEN_AI_HUGGINGFACE_API_KEY"
need_env "RAVEN_AI_PERPLEXITY_API_KEY"
need_env "RAVEN_AI_ELEVENLABS_API_KEY"

echo "Setting HuggingFace key (admin_set_llm_api_key)..."
$DFX canister call --network ic raven_ai admin_set_llm_api_key \
  "(\"HuggingFace\", \"${RAVEN_AI_HUGGINGFACE_API_KEY}\")" >/dev/null

echo "Setting Perplexity key (admin_set_llm_api_key)..."
$DFX canister call --network ic raven_ai admin_set_llm_api_key \
  "(\"Perplexity\", \"${RAVEN_AI_PERPLEXITY_API_KEY}\")" >/dev/null

echo "Setting ElevenLabs key (admin_set_eleven_labs_api_key)..."
$DFX canister call --network ic raven_ai admin_set_eleven_labs_api_key \
  "(\"${RAVEN_AI_ELEVENLABS_API_KEY}\")" >/dev/null

echo ""
echo "✅ Keys updated. Provider readiness now:"
$DFX canister call --network ic raven_ai get_llm_providers "()"


