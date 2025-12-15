#!/usr/bin/env node
/**
 * Comprehensive Canister Audit Script
 * Checks: WASM installation, status, cycles, controllers, frontend wiring
 */

import { readFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { IDL } from '@dfinity/candid';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

// Management Canister IDL
const managementIDL = ({ IDL }) => IDL.Service({
  canister_status: IDL.Func(
    [IDL.Record({ canister_id: IDL.Principal })],
    [
      IDL.Record({
        status: IDL.Variant({
          running: IDL.Null,
          stopping: IDL.Null,
          stopped: IDL.Null,
        }),
        settings: IDL.Record({
          controllers: IDL.Vec(IDL.Principal),
          compute_allocation: IDL.Opt(IDL.Nat),
          memory_allocation: IDL.Opt(IDL.Nat),
          freezing_threshold: IDL.Opt(IDL.Nat),
        }),
        module_hash: IDL.Opt(IDL.Vec(IDL.Nat8)),
        cycles: IDL.Nat64,
        memory_size: IDL.Nat,
      }),
    ],
    ['query']
  ),
  install_code: IDL.Func(
    [
      IDL.Record({
        mode: IDL.Variant({
          install: IDL.Null,
          reinstall: IDL.Null,
          upgrade: IDL.Null,
        }),
        canister_id: IDL.Principal,
        wasm_module: IDL.Vec(IDL.Nat8),
        arg: IDL.Vec(IDL.Nat8),
      }),
    ],
    [],
    []
  ),
});

// Load dfx.json to get all canisters
function loadDfxConfig() {
  const dfxJson = JSON.parse(readFileSync('dfx.json', 'utf-8'));
  return dfxJson.canisters || {};
}

// Load frontend config
function loadFrontendConfig() {
  try {
    const configPath = 'frontend/src/services/canisterConfig.ts';
    const content = readFileSync(configPath, 'utf-8');
    return content;
  } catch (error) {
    return null;
  }
}

// Load identity
function loadIdentity() {
  const identityPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
  try {
    const identityPem = readFileSync(identityPath, 'utf-8');
    return Secp256k1KeyIdentity.fromPem(identityPem);
  } catch (error) {
    // Try default identity
    const defaultPath = join(homedir(), '.config', 'dfx', 'identity', 'default', 'identity.pem');
    const identityPem = readFileSync(defaultPath, 'utf-8');
    return Secp256k1KeyIdentity.fromPem(identityPem);
  }
}

// Get canister ID from dfx
function getCanisterId(canisterName) {
  try {
    const result = execSync(`dfx canister --network ic id ${canisterName} 2>&1`, {
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1', TERM: 'dumb' }
    }).trim();
    
    if (result.match(/^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}$/)) {
      return result;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Check canister status
async function checkCanister(agent, canisterId, canisterName) {
  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  try {
    const status = await managementActor.canister_status({
      canister_id: Principal.fromText(canisterId),
    });

    const hasWasm = status.module_hash.length > 0;
    const statusType = Object.keys(status.status)[0];
    const cycles = status.cycles.toString();
    const controllers = status.settings.controllers.map(c => c.toText());
    const memorySize = status.memory_size.toString();

    return {
      exists: true,
      hasWasm,
      status: statusType,
      cycles,
      controllers,
      memorySize,
      moduleHash: status.module_hash.length > 0 
        ? Array.from(status.module_hash).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16) + '...'
        : 'None',
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message,
    };
  }
}

// Check if WASM file exists
function checkWasmFile(canisterName) {
  const possiblePaths = [
    `target/wasm32-unknown-unknown/release/${canisterName}.wasm`,
    `backend/${canisterName}/target/wasm32-unknown-unknown/release/${canisterName}.wasm`,
  ];

  for (const path of possiblePaths) {
    try {
      const stats = readFileSync(path);
      return {
        exists: true,
        path,
        size: (stats.length / 1024 / 1024).toFixed(2) + ' MB',
      };
    } catch (error) {
      // Try next path
    }
  }

  return { exists: false };
}

// Check if canister is in frontend config
function checkFrontendWiring(frontendConfig, canisterName, canisterId) {
  if (!frontendConfig) return { wired: false, reason: 'Config file not found' };
  
  const hasId = frontendConfig.includes(canisterId);
  const hasName = frontendConfig.includes(canisterName);
  
  return {
    wired: hasId || hasName,
    hasId,
    hasName,
  };
}

// Install WASM if missing
async function installWasm(agent, canisterId, canisterName, wasmPath) {
  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  try {
    const wasmModule = readFileSync(wasmPath);
    console.log(`      📦 Installing WASM (${(wasmModule.length / 1024 / 1024).toFixed(2)} MB)...`);

    await managementActor.install_code({
      mode: { reinstall: null },
      canister_id: Principal.fromText(canisterId),
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 COMPREHENSIVE CANISTER AUDIT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load configs
  const dfxConfig = loadDfxConfig();
  const frontendConfig = loadFrontendConfig();
  const identity = loadIdentity();
  
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  const canisters = Object.keys(dfxConfig);
  console.log(`📋 Found ${canisters.length} canisters in dfx.json\n`);

  const results = [];
  const needsInstallation = [];

  for (const canisterName of canisters) {
    console.log(`\n🔍 Checking ${canisterName}...`);
    
    // Get canister ID
    const canisterId = getCanisterId(canisterName);
    if (!canisterId) {
      console.log(`   ❌ No canister ID found`);
      results.push({
        name: canisterName,
        id: null,
        status: 'NOT_CREATED',
        hasWasm: false,
        wired: false,
      });
      continue;
    }

    console.log(`   ID: ${canisterId}`);

    // Check canister status
    const status = await checkCanister(agent, canisterId, canisterName);
    
    if (!status.exists) {
      console.log(`   ❌ Canister does not exist`);
      results.push({
        name: canisterName,
        id: canisterId,
        status: 'NOT_EXISTS',
        hasWasm: false,
        wired: false,
      });
      continue;
    }

    // Check WASM file
    const wasmFile = checkWasmFile(canisterName);
    
    // Check frontend wiring
    const wiring = checkFrontendWiring(frontendConfig, canisterName, canisterId);

    // Display status
    const statusIcon = status.hasWasm ? '✅' : '❌';
    const statusText = status.hasWasm ? 'INSTALLED' : 'NO_WASM';
    
    console.log(`   ${statusIcon} WASM: ${statusText}`);
    console.log(`   📊 Status: ${status.status.toUpperCase()}`);
    console.log(`   💰 Cycles: ${(BigInt(status.cycles) / BigInt(1_000_000_000_000)).toString()} TC`);
    console.log(`   🧠 Memory: ${(BigInt(status.memorySize) / BigInt(1024 * 1024)).toString()} MB`);
    console.log(`   🔑 Controllers: ${status.controllers.length}`);
    console.log(`   📝 Module Hash: ${status.moduleHash}`);
    
    if (wasmFile.exists) {
      console.log(`   📦 WASM File: ${wasmFile.path} (${wasmFile.size})`);
    } else {
      console.log(`   ⚠️  WASM File: Not found`);
    }
    
    if (wiring.wired) {
      console.log(`   ✅ Frontend: Wired`);
    } else {
      console.log(`   ❌ Frontend: Not wired`);
    }

    results.push({
      name: canisterName,
      id: canisterId,
      status: status.status,
      hasWasm: status.hasWasm,
      cycles: status.cycles,
      memorySize: status.memorySize,
      controllers: status.controllers,
      wasmFile: wasmFile.exists,
      wasmPath: wasmFile.exists ? wasmFile.path : null,
      wired: wiring.wired,
    });

    // Track canisters that need installation
    if (!status.hasWasm && wasmFile.exists) {
      needsInstallation.push({
        name: canisterName,
        id: canisterId,
        wasmPath: wasmFile.path,
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 AUDIT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const total = results.length;
  const withWasm = results.filter(r => r.hasWasm).length;
  const withoutWasm = results.filter(r => !r.hasWasm && r.id).length;
  const notCreated = results.filter(r => !r.id).length;
  const wired = results.filter(r => r.wired).length;
  const notWired = results.filter(r => !r.wired && r.id).length;

  console.log(`Total Canisters: ${total}`);
  console.log(`✅ With WASM: ${withWasm}`);
  console.log(`❌ Without WASM: ${withoutWasm}`);
  console.log(`⚠️  Not Created: ${notCreated}`);
  console.log(`✅ Frontend Wired: ${wired}`);
  console.log(`❌ Frontend Not Wired: ${notWired}`);

  if (needsInstallation.length > 0) {
    console.log(`\n📦 Canisters Needing WASM Installation: ${needsInstallation.length}`);
    needsInstallation.forEach(c => {
      console.log(`   - ${c.name} (${c.id})`);
    });

    console.log(`\n🚀 Installing missing WASM modules...\n`);
    for (const canister of needsInstallation) {
      console.log(`\n📦 Installing ${canister.name}...`);
      const result = await installWasm(agent, canister.id, canister.name, canister.wasmPath);
      if (result.success) {
        console.log(`   ✅ ${canister.name} installed successfully!`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Detailed report
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 DETAILED REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach(r => {
    const wasmStatus = r.hasWasm ? '✅' : '❌';
    const wiredStatus = r.wired ? '✅' : '❌';
    console.log(`${r.name}:`);
    console.log(`  ID: ${r.id || 'N/A'}`);
    console.log(`  WASM: ${wasmStatus} ${r.hasWasm ? 'Installed' : 'Missing'}`);
    console.log(`  Frontend: ${wiredStatus} ${r.wired ? 'Wired' : 'Not Wired'}`);
    console.log(`  Status: ${r.status || 'N/A'}`);
    if (r.cycles) {
      console.log(`  Cycles: ${(BigInt(r.cycles) / BigInt(1_000_000_000_000)).toString()} TC`);
    }
    console.log('');
  });

  console.log('\n✅ Audit complete!\n');
}

main().catch(console.error);
