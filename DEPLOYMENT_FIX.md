# DFX Color Output Fix

## Issue
DFX was failing with: `Failed to set stderr output color.: ColorOutOfRange`

## Solution

### VS Code Settings
Add to your VS Code `settings.json`:
```json
"terminal.integrated.env.osx": {
  "TERM": "xterm-256color"
}
```

### Or use environment variable in commands:
```bash
TERM=xterm-256color dfx deploy <canister> --network ic
```

## Current Deployment Status

All canisters are deploying with `TERM=xterm-256color` set:
- `deepseek_model` - Log: `/tmp/deepseek_deploy.log`
- `vector_db` - Log: `/tmp/vector_db_deploy.log`
- `queen_bee` - Log: `/tmp/queen_bee_deploy.log`

## Check Status

```bash
# Check logs
tail -f /tmp/deepseek_deploy.log
tail -f /tmp/vector_db_deploy.log
tail -f /tmp/queen_bee_deploy.log

# Check canister IDs (once deployed)
TERM=xterm-256color dfx canister id deepseek_model --network ic
TERM=xterm-256color dfx canister id vector_db --network ic
TERM=xterm-256color dfx canister id queen_bee --network ic
```

## Next Steps After Deployment

1. Register canisters:
   ```bash
   TERM=xterm-256color ./scripts/register_canisters.sh
   ```

2. Update axiom_nft:
   ```bash
   TERM=xterm-256color ./scripts/update_queen_bee_config.sh
   ```

3. Deploy updated axiom_nft canisters




