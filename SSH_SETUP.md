# SSH Key Setup for GitHub

## Current Issue

SSH push is failing with "Permission denied (publickey)" because:
- No SSH keys are set up, OR
- SSH keys exist but aren't added to your GitHub account

## Quick Setup: Generate SSH Key

### Step 1: Generate SSH Key

```bash
# Generate a new SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Press Enter to accept default file location (~/.ssh/id_ed25519)
# Optionally set a passphrase (recommended for security)
```

### Step 2: Add SSH Key to SSH Agent

```bash
# Start the ssh-agent
eval "$(ssh-agent -s)"

# Add your SSH key to the agent
ssh-add ~/.ssh/id_ed25519
```

### Step 3: Add SSH Key to GitHub

1. **Copy your public key**:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

2. **Add to GitHub**:
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Title: `TRP_Unified_Mac` (or any name)
   - Key: Paste the output from step 1
   - Click "Add SSH key"

### Step 4: Test Connection

```bash
ssh -T git@github.com
```

You should see: "Hi NDKONG-ICP! You've successfully authenticated..."

### Step 5: Push

```bash
cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"
git push -u origin main
```

## Alternative: Use HTTPS with Token

If you prefer not to set up SSH:

```bash
# Switch back to HTTPS
cd "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem"
git remote set-url origin https://github.com/NDKONG-ICP/TRP_Unified.git

# Create Personal Access Token at: https://github.com/settings/tokens
# Then push (use token as password)
git push -u origin main
```

---

**Choose your preferred method and let me know if you need help!**
