# Quick Start Guide

## TypeScript + Vite Setup (Standard ICP Pattern)

This project uses the standard ICP development pattern:
- **TypeScript** for canister interfaces and frontend logic
- **Vite** for building and serving the UI
- **Rust** for canister backend code

## Quick Commands

### Development

```bash
# Start dfx replica (Terminal 1)
dfx start

# Generate declarations and start dev server (Terminal 2)
./scripts/dev.sh

# Or manually:
dfx generate
cd frontend
npm run dev
```

### Build

```bash
# Full build (generate + vite build)
./scripts/build.sh

# Or manually:
dfx generate
cd frontend
npm run build
```

### Deploy

```bash
# Build and deploy
./scripts/build.sh
dfx deploy
```

## Frontend Scripts

From `frontend/` directory:

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run generate` - Generate TypeScript declarations
- `npm run build:full` - Generate + build
- `npm run type-check` - Type-check TypeScript
- `npm run lint` - Lint code

## Project Structure

```
raven-unified-ecosystem/
├── backend/              # Rust canisters
├── frontend/             # TypeScript + React
│   ├── src/
│   │   ├── declarations/ # Generated TypeScript interfaces
│   │   └── ...
│   └── vite.config.ts
├── src/declarations/     # Root-level generated declarations
├── dfx.json
└── scripts/
    ├── build.sh          # Full build script
    └── dev.sh            # Dev script
```

## TypeScript Workflow

1. **Change CANDID files** → Update `backend/*/*.did`
2. **Generate declarations** → `dfx generate`
3. **Use in frontend** → Import from `@declarations/*` or `src/declarations/*`
4. **Type-check** → `npm run type-check`
5. **Build** → `npm run build`

## Vite Configuration

- **Dev server**: `http://localhost:5173`
- **Proxy**: Routes to local dfx replica (port 4943)
- **Code splitting**: Vendor, dfinity, and UI chunks
- **TypeScript**: Full support with type checking

## Troubleshooting

**TypeScript errors about missing declarations?**
```bash
dfx generate
```

**Build fails?**
```bash
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

**Canister connection issues?**
- Ensure dfx is running: `dfx start`
- Check canister IDs in `frontend/src/services/canisterConfig.ts`
- Verify network (local vs mainnet)

## More Information

See [README_BUILD.md](./README_BUILD.md) for detailed documentation.

