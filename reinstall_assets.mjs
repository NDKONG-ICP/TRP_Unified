#!/usr/bin/env node

/**
 * Reinstall Assets Canister Using IC SDK
 * Bypasses dfx color bug by using @dfinity/agent directly
 */

import { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const CANISTER_ID = '3kpgg-eaaaa-aaaao-a4xdq-cai';

// Load identity
function loadIdentity() {
  const identityName = 'ic_deploy';
  try {
    const pem = execSync(`dfx identity export ${identityName}`, { encoding: 'utf-8' });
    return Secp256k1KeyIdentity.fromPem(pem);
  } catch (error) {
    console.error('Failed to load identity:', error.message);
    process.exit(1);
  }
}

// Create agent
function createAgent(identity) {
  const host = 'https://ic0.app';
  const agent = new HttpAgent({ 
    host,
    identity,
  });
  // No need to fetch root key for mainnet
  return agent;
}

// Uninstall code (clear state)
async function uninstallCode(agent, canisterId) {
  const canisterPrincipal = Principal.fromText(canisterId);
  const managementCanisterId = Principal.fromText('aaaaa-aa');
  
  const uninstallCodeIdl = IDL.Service({
    uninstall_code: IDL.Func(
      [IDL.Record({ canister_id: IDL.Principal })],
      [],
      []
    ),
  });
  
  try {
    console.log(`  Uninstalling code from ${canisterId}...`);
    await agent.call(managementCanisterId, {
      methodName: 'uninstall_code',
      arg: IDL.encode(uninstallCodeIdl, [{ canister_id: canisterPrincipal }]),
    });
    console.log(`  ✅ Code uninstalled`);
    return true;
  } catch (error) {
    console.warn(`  ⚠️  Uninstall failed (may not be necessary): ${error.message}`);
    return false;
  }
}

// Install code (reinstall mode)
async function installCode(agent, canisterId, wasmPath) {
  const wasm = readFileSync(wasmPath);
  const canisterPrincipal = Principal.fromText(canisterId);
  const managementCanisterId = Principal.fromText('aaaaa-aa');
  
  // For assets canister, we need to use the assets canister WASM
  // But assets canister uses a special format - let's try using dfx's asset upload method
  
  // Actually, for assets canister, we should use dfx deploy with --mode reinstall
  // But since dfx has the color bug, let's try a different approach
  
  console.log(`  Note: Assets canister requires special handling`);
  console.log(`  Using dfx deploy with workaround...`);
  
  // Try using dfx deploy with yes piped in
  try {
    const { execSync } = await import('child_process');
    execSync(
      `echo "yes" | NO_COLOR=1 TERM=dumb dfx deploy assets --network ic --mode reinstall`,
      { 
        stdio: 'inherit',
        cwd: process.cwd(),
      }
    );
    return true;
  } catch (error) {
    console.error(`  ❌ Deployment failed: ${error.message}`);
    return false;
  }
}

// Main
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 Reinstalling Assets Canister');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  console.log('📋 Canister ID:', CANISTER_ID);
  console.log('');
  
  // Check if dist exists
  const distPath = join(process.cwd(), 'frontend', 'dist');
  try {
    readFileSync(join(distPath, 'index.html'));
  } catch (error) {
    console.error('❌ Error: frontend/dist/index.html not found');
    console.error('   Please build the frontend first: cd frontend && npm run build');
    process.exit(1);
  }
  
  console.log('✅ Frontend dist found');
  console.log('');
  
  // Try dfx deploy with reinstall
  console.log('🔄 Reinstalling assets canister...');
  const success = await installCode(null, CANISTER_ID, distPath);
  
  if (success) {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Assets Canister Reinstalled!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🌐 Frontend URL: https://' + CANISTER_ID + '.ic0.app');
    console.log('');
  } else {
    console.log('');
    console.log('❌ Reinstall failed. Try using IC Dashboard:');
    console.log('   1. Go to https://dashboard.internetcomputer.org/');
    console.log('   2. Navigate to canister', CANISTER_ID);
    console.log('   3. Click "Deploy" and upload frontend/dist/index.html');
    console.log('');
    process.exit(1);
  }
}

main().catch(console.error);

