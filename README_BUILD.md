# Build System Documentation

This project follows the standard ICP (Internet Computer Protocol) development pattern:
- **TypeScript** for canister interfaces and frontend logic
- **Vite** for building and serving the UI
- **Rust** for canister backend code (compiled to WebAssembly)

## Architecture

### Canister Code
- **Language**: Rust
- **Location**: `backend/*/`
- **CANDID Interfaces**: `backend/*/*.did`
- **Compilation**: Handled by `dfx` (DFINITY SDK)

### Frontend Code
- **Language**: TypeScript
- **Location**: `frontend/src/`
- **Build Tool**: Vite
- **Framework**: React

### TypeScript Declarations
- **Generated from**: CANDID files (`.did`)
- **Command**: `dfx generate`
- **Location**: `src/declarations/` and `frontend/src/declarations/`
- **Usage**: Imported in frontend services for type-safe canister calls

## Build Workflow

### 1. Generate TypeScript Declarations

Generate TypeScript interfaces from CANDID files:

```bash
dfx generate
```

This creates TypeScript type definitions for all canisters in:
- `src/declarations/` (root level)
- `frontend/src/declarations/` (frontend-specific)

### 2. Build Frontend

Build the frontend with Vite:

```bash
cd frontend
npm run build
```

Or use the full build script:

```bash
./scripts/build.sh
```

### 3. Development

Start development server:

```bash
# Terminal 1: Start dfx replica
dfx start

# Terminal 2: Start Vite dev server
cd frontend
npm run dev
```

Or use the dev script:

```bash
./scripts/dev.sh
```

## Available Scripts

### Root Level Scripts

- `./scripts/build.sh` - Full build (generate + vite build)
- `./scripts/dev.sh` - Development mode (generate + vite dev)

### Frontend Scripts (in `frontend/`)

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint TypeScript/React code
- `npm run type-check` - Type-check without emitting
- `npm run generate` - Generate TypeScript declarations from CANDID
- `npm run build:full` - Generate + build (full workflow)

## Project Structure

```
raven-unified-ecosystem/
├── backend/              # Rust canister code
│   ├── core/
│   ├── nft/
│   ├── raven_ai/
│   └── ...
├── frontend/             # TypeScript + React frontend
│   ├── src/
│   │   ├── declarations/ # Generated TypeScript interfaces
│   │   ├── services/     # Canister service wrappers
│   │   ├── components/   # React components
│   │   └── ...
│   ├── vite.config.ts    # Vite configuration
│   └── package.json
├── src/                  # Root-level generated declarations
│   └── declarations/
├── dfx.json              # Canister configuration
└── scripts/              # Build and deployment scripts
```

## TypeScript Configuration

The project uses TypeScript for:
1. **Canister Interfaces**: Generated from CANDID files via `dfx generate`
2. **Frontend Logic**: All React components, services, and utilities
3. **Type Safety**: Full type checking across canister calls

### TypeScript Paths

Configured in `frontend/tsconfig.json`:
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@services/*` → `src/services/*`
- `@declarations/*` → `src/declarations/*`

## Vite Configuration

Vite is configured for:
- **Development**: Hot module replacement, fast refresh
- **Production**: Optimized builds with code splitting
- **ICP Integration**: Proxy configuration for local dfx replica
- **TypeScript**: Full TypeScript support with type checking

### Key Features

- **Proxy**: Routes `/api` and `/canister` to local dfx replica (port 4943)
- **Code Splitting**: Separates vendor, dfinity, and UI chunks
- **Optimization**: Tree-shaking and minification for production
- **Source Maps**: Enabled in development

## Deployment

### Local Development

1. Start dfx replica: `dfx start`
2. Deploy canisters: `dfx deploy`
3. Start frontend: `cd frontend && npm run dev`

### Production Build

1. Generate declarations: `dfx generate`
2. Build frontend: `cd frontend && npm run build`
3. Deploy: `dfx deploy`

Or use the build script: `./scripts/build.sh`

## Best Practices

1. **Always generate declarations** after changing CANDID files
2. **Type-check before building**: `npm run type-check`
3. **Use TypeScript interfaces** from declarations for type safety
4. **Keep canister interfaces in sync** with backend changes
5. **Test locally** before deploying to mainnet

## Troubleshooting

### TypeScript Errors

If you see TypeScript errors about missing declarations:
```bash
dfx generate
cd frontend
npm run type-check
```

### Build Failures

1. Ensure all dependencies are installed: `npm install`
2. Generate fresh declarations: `dfx generate`
3. Clear build cache: `rm -rf frontend/dist frontend/node_modules/.vite`

### Canister Connection Issues

1. Ensure dfx replica is running: `dfx start`
2. Check canister IDs in `frontend/src/services/canisterConfig.ts`
3. Verify network configuration (local vs mainnet)

## References

- [DFINITY SDK Documentation](https://internetcomputer.org/docs/current/developer-docs/setup/install/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [CANDID Specification](https://internetcomputer.org/docs/current/references/candid-ref/)

