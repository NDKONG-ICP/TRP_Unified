# Connect GitHub to Cursor IDE

## Method 1: Via Cursor Settings (Easiest) ⭐

1. **Open Settings**:
   - Press `Cmd + ,` (macOS) or `Ctrl + ,` (Windows/Linux)
   - Or: Cursor → Settings → Settings

2. **Search for GitHub**:
   - Type "github" in the search bar
   - Look for "Git: GitHub Authentication" or "GitHub"

3. **Sign in to GitHub**:
   - Click "Sign in with GitHub"
   - This will open a browser window
   - Authorize Cursor to access your GitHub account
   - Return to Cursor

4. **Verify Connection**:
   - You should see your GitHub username in the status bar
   - Or check: View → Command Palette → "GitHub: Show GitHub Authentication Status"

## Method 2: Via Command Palette

1. **Open Command Palette**:
   - Press `Cmd + Shift + P` (macOS) or `Ctrl + Shift + P` (Windows/Linux)

2. **Search for GitHub**:
   - Type: `GitHub: Sign in`
   - Select "GitHub: Sign in"

3. **Authorize**:
   - Browser will open for authorization
   - Click "Authorize Cursor"
   - Return to Cursor

## Method 3: Via Source Control Panel

1. **Open Source Control**:
   - Click the Source Control icon in the sidebar (or `Ctrl + Shift + G`)

2. **Click "..." menu**:
   - Click the three dots at the top of Source Control panel

3. **Select "Remote" → "Add Remote"**:
   - Or use "Publish to GitHub" if repository isn't on GitHub yet

4. **Sign in when prompted**:
   - Cursor will prompt you to sign in to GitHub
   - Follow the authorization flow

## After Connecting

Once connected, you can:

### Push to GitHub Directly from Cursor

1. **Make changes** to your files
2. **Open Source Control** (`Ctrl + Shift + G`)
3. **Stage changes** (click `+` next to files)
4. **Commit** (enter message and press `Cmd + Enter`)
5. **Push** (click the up arrow `↑` or "Push" button)

### Or Use Command Palette

1. `Cmd + Shift + P` → `Git: Push`
2. Select your remote (origin)
3. Select branch (main)

## Verify Connection

To check if you're connected:

1. **Command Palette** (`Cmd + Shift + P`)
2. Type: `GitHub: Show GitHub Authentication Status`
3. You should see your GitHub username

## Troubleshooting

### "Not signed in"
- Go to Settings → Search "github"
- Click "Sign in with GitHub" again
- Make sure browser allows popups

### "Permission denied"
- Check you have write access to the repository
- Verify you're signed in with the correct GitHub account
- Try signing out and back in

### "Repository not found"
- Verify the repository exists: https://github.com/NDKONG-ICP/TRP_Unified
- Check you have access to the NDKONG-ICP organization

## Quick Push for TRP_Unified

Once connected:

1. **Open Source Control** in Cursor
2. **Stage all changes** (if any)
3. **Commit** with message: "Initial commit: TRP Unified"
4. **Push** to `origin/main`

Or use terminal in Cursor:
```bash
git push -u origin main
```

---

**After connecting, you can push directly from Cursor's UI!** 🚀
