#!/usr/bin/env node
/**
 * Verify and Install WASM for All Canisters
 * Uses Management Canister directly to bypass dfx issues
 */

import { readFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { IDL } from '@dfinity/candid';
import { homedir } from 'os';
import { join } from 'path';

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

// Canister IDs from frontend config
const CANISTER_IDS = {
  core: 'qb6fv-6aaaa-aaaao-a4w7q-cai',
  nft: '37ixl-fiaaa-aaaao-a4xaa-cai',
  kip: '3yjr7-iqaaa-aaaao-a4xaq-cai',
  treasury: '3rk2d-6yaaa-aaaao-a4xba-cai',
  escrow: '3wl4x-taaaa-aaaao-a4xbq-cai',
  logistics: '3dmn2-siaaa-aaaao-a4xca-cai',
  ai_engine: '3enlo-7qaaa-aaaao-a4xcq-cai',
  raven_ai: '3noas-jyaaa-aaaao-a4xda-cai',
  assets: '3kpgg-eaaaa-aaaao-a4xdq-cai',
  deepseek_model: 'kqj56-2aaaa-aaaao-a4ygq-cai',
  vector_db: 'kzkwc-miaaa-aaaao-a4yha-cai',
  queen_bee: 'k6lqw-bqaaa-aaaao-a4yhq-cai',
  staking: 'inutw-jiaaa-aaaao-a4yja-cai',
  axiom_nft: 'arx4x-cqaaa-aaaao-a4z5q-cai',
  axiom_1: '46odg-5iaaa-aaaao-a4xqa-cai',
  axiom_2: '4zpfs-qqaaa-aaaao-a4xqq-cai',
  axiom_3: '4ckzx-kiaaa-aaaao-a4xsa-cai',
  axiom_4: '4fl7d-hqaaa-aaaao-a4xsq-cai',
  axiom_5: '4miu7-ryaaa-aaaao-a4xta-cai',
  siwe_canister: 'ehdei-liaaa-aaaao-a4zfa-cai',
  siws_canister: 'eacc4-gqaaa-aaaao-a4zfq-cai',
  siwb_canister: 'evftr-hyaaa-aaaao-a4zga-cai',
  sis_canister: 'e3h6z-4iaaa-aaaao-a4zha-cai',
  ordinals_canister: 'gb3wf-cyaaa-aaaao-a4zia-cai',
};

function loadIdentity() {
  const paths = [
    join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem'),
    join(homedir(), '.config', 'dfx', 'identity', 'default', 'identity.pem'),
  ];
  
  for (const path of paths) {
    try {
      const identityPem = readFileSync(path, 'utf-8');
      return Secp256k1KeyIdentity.fromPem(identityPem);
    } catch (e) {
      // Try next path
    }
  }
  throw new Error('Could not load identity');
}

function findWasmFile(canisterName) {
  const paths = [
    `target/wasm32-unknown-unknown/release/${canisterName}.wasm`,
    `backend/${canisterName}/target/wasm32-unknown-unknown/release/${canisterName}.wasm`,
  ];
  
  for (const path of paths) {
    try {
      readFileSync(path);
      return path;
    } catch (e) {
      // Try next
    }
  }
  return null;
}

async function checkCanister(agent, canisterId, canisterName) {
  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  try {
    const status = await managementActor.canister_status({
      canister_id: Principal.fromText(canisterId),
    });

    return {
      exists: true,
      hasWasm: status.module_hash.length > 0,
      status: Object.keys(status.status)[0],
      cycles: status.cycles.toString(),
      controllers: status.settings.controllers.map(c => c.toText()),
    };
  } catch (error) {
    if (error.message.includes('canister_not_found')) {
      return { exists: false };
    }
    throw error;
  }
}

async function installWasm(agent, canisterId, canisterName, wasmPath) {
  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  const wasmModule = readFileSync(wasmPath);
  console.log(`      📦 Installing WASM (${(wasmModule.length / 1024 / 1024).toFixed(2)} MB)...`);

  await managementActor.install_code({
    mode: { reinstall: null },
    canister_id: Principal.fromText(canisterId),
    wasm_module: Array.from(new Uint8Array(wasmModule)),
    arg: [],
  });

  return true;
}

async function main() {
  console.log('🔍 VERIFYING AND INSTALLING WASM FOR ALL CANISTERS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  const results = [];
  const needsInstall = [];

  for (const [canisterName, canisterId] of Object.entries(CANISTER_IDS)) {
    console.log(`🔍 Checking ${canisterName}...`);
    console.log(`   ID: ${canisterId}`);

    try {
      const status = await checkCanister(agent, canisterId, canisterName);

      if (!status.exists) {
        console.log(`   ❌ Canister does not exist`);
        results.push({ name: canisterName, id: canisterId, exists: false });
        console.log('');
        continue;
      }

      const wasmPath = findWasmFile(canisterName);
      const cyclesTC = (BigInt(status.cycles) / BigInt(1_000_000_000_000)).toString();

      if (status.hasWasm) {
        console.log(`   ✅ WASM: Installed`);
        console.log(`   📊 Status: ${status.status}`);
        console.log(`   💰 Cycles: ${cyclesTC} TC`);
      } else {
        console.log(`   ❌ WASM: Not installed`);
        console.log(`   📊 Status: ${status.status}`);
        console.log(`   💰 Cycles: ${cyclesTC} TC`);
        
        if (wasmPath) {
          console.log(`   ✅ WASM File: Found (${wasmPath})`);
          needsInstall.push({ name: canisterName, id: canisterId, path: wasmPath });
        } else {
          console.log(`   ⚠️  WASM File: Not found - needs build`);
        }
      }

      results.push({
        name: canisterName,
        id: canisterId,
        exists: true,
        hasWasm: status.hasWasm,
        cycles: cyclesTC,
      });

      console.log('');
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({ name: canisterName, id: canisterId, error: error.message });
      console.log('');
    }
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const total = results.length;
  const withWasm = results.filter(r => r.hasWasm).length;
  const withoutWasm = results.filter(r => r.exists && !r.hasWasm).length;
  const notExist = results.filter(r => !r.exists).length;

  console.log(`Total Canisters: ${total}`);
  console.log(`✅ With WASM: ${withWasm}`);
  console.log(`❌ Without WASM: ${withoutWasm}`);
  console.log(`⚠️  Not Created: ${notExist}`);
  console.log(`📦 Ready to Install: ${needsInstall.length}`);
  console.log('');

  // Install missing WASM
  if (needsInstall.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 INSTALLING MISSING WASM MODULES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const canister of needsInstall) {
      console.log(`📦 Installing ${canister.name}...`);
      try {
        await installWasm(agent, canister.id, canister.name, canister.path);
        console.log(`   ✅ ${canister.name} installed successfully!\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
      }
    }
  }

  // Final report
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 FINAL STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const result of results) {
    if (result.exists) {
      const wasmStatus = result.hasWasm ? '✅' : '❌';
      console.log(`${result.name}: ${wasmStatus} WASM ${result.hasWasm ? 'Installed' : 'Missing'} | Cycles: ${result.cycles} TC`);
    } else {
      console.log(`${result.name}: ⚠️  Not created`);
    }
  }

  console.log('\n✅ Audit and installation complete!\n');
}

main().catch(console.error);
