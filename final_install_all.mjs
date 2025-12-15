#!/usr/bin/env node
/**
 * Final Comprehensive WASM Installation
 * Installs WASM for ALL canisters that need it
 */

import { readFileSync, statSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { IDL } from '@dfinity/candid';
import { homedir } from 'os';
import { join } from 'path';

const CANISTERS = [
  { name: 'core', id: 'qb6fv-6aaaa-aaaao-a4w7q-cai' },
  { name: 'nft', id: '37ixl-fiaaa-aaaao-a4xaa-cai' },
  { name: 'kip', id: '3yjr7-iqaaa-aaaao-a4xaq-cai' },
  { name: 'treasury', id: '3rk2d-6yaaa-aaaao-a4xba-cai' },
  { name: 'escrow', id: '3wl4x-taaaa-aaaao-a4xbq-cai' },
  { name: 'logistics', id: '3dmn2-siaaa-aaaao-a4xca-cai' },
  { name: 'ai_engine', id: '3enlo-7qaaa-aaaao-a4xcq-cai' },
  { name: 'raven_ai', id: '3noas-jyaaa-aaaao-a4xda-cai' },
  { name: 'deepseek_model', id: 'kqj56-2aaaa-aaaao-a4ygq-cai' },
  { name: 'vector_db', id: 'kzkwc-miaaa-aaaao-a4yha-cai' },
  { name: 'queen_bee', id: 'k6lqw-bqaaa-aaaao-a4yhq-cai' },
  { name: 'staking', id: 'inutw-jiaaa-aaaao-a4yja-cai' },
  { name: 'axiom_nft', id: 'arx4x-cqaaa-aaaao-a4z5q-cai' },
  { name: 'siwe_canister', id: 'ehdei-liaaa-aaaao-a4zfa-cai' },
  { name: 'siws_canister', id: 'eacc4-gqaaa-aaaao-a4zfq-cai' },
  { name: 'siwb_canister', id: 'evftr-hyaaa-aaaao-a4zga-cai' },
  { name: 'sis_canister', id: 'e3h6z-4iaaa-aaaao-a4zha-cai' },
  { name: 'ordinals_canister', id: 'gb3wf-cyaaa-aaaao-a4zia-cai' },
  // AXIOM individuals use axiom_nft.wasm
  { name: 'axiom_1', id: '46odg-5iaaa-aaaao-a4xqa-cai', wasm: 'axiom_nft' },
  { name: 'axiom_2', id: '4zpfs-qqaaa-aaaao-a4xqq-cai', wasm: 'axiom_nft' },
  { name: 'axiom_3', id: '4ckzx-kiaaa-aaaao-a4xsa-cai', wasm: 'axiom_nft' },
  { name: 'axiom_4', id: '4fl7d-hqaaa-aaaao-a4xsq-cai', wasm: 'axiom_nft' },
  { name: 'axiom_5', id: '4miu7-ryaaa-aaaao-a4xta-cai', wasm: 'axiom_nft' },
];

function loadIdentity() {
  const paths = [
    join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem'),
    join(homedir(), '.config', 'dfx', 'identity', 'default', 'identity.pem'),
  ];
  
  for (const path of paths) {
    try {
      return Secp256k1KeyIdentity.fromPem(readFileSync(path, 'utf-8'));
    } catch (e) {}
  }
  throw new Error('Could not load identity');
}

function findWasmFile(canisterName, wasmOverride) {
  const wasmName = wasmOverride || canisterName;
  const paths = [
    `target/wasm32-unknown-unknown/release/${wasmName}.wasm`,
    `backend/${wasmName}/target/wasm32-unknown-unknown/release/${wasmName}.wasm`,
  ];
  
  for (const path of paths) {
    try {
      readFileSync(path);
      return path;
    } catch (e) {}
  }
  return null;
}

async function installWasm(agent, canisterId, canisterName, wasmPath) {
  const managementIDL = ({ IDL }) => IDL.Service({
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

  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  const wasmModule = readFileSync(wasmPath);
  console.log(`      📦 Installing ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB...`);

  await managementActor.install_code({
    mode: { reinstall: null },
    canister_id: Principal.fromText(canisterId),
    wasm_module: Array.from(new Uint8Array(wasmModule)),
    arg: [],
  });

  return true;
}

async function main() {
  console.log('🚀 FINAL COMPREHENSIVE WASM INSTALLATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  let installed = 0;
  let failed = 0;
  let skipped = 0;

  for (const canister of CANISTERS) {
    console.log(`🔍 Processing ${canister.name}...`);
    console.log(`   ID: ${canister.id}`);

    const wasmPath = findWasmFile(canister.name, canister.wasm);
    
    if (!wasmPath) {
      console.log(`   ⚠️  WASM file not found - skipping`);
      skipped++;
      console.log('');
      continue;
    }

    const wasmSize = (statSync(wasmPath).size / 1024 / 1024).toFixed(2);
    console.log(`   ✅ WASM File: ${wasmPath} (${wasmSize} MB)`);
    console.log(`   📦 Installing...`);

    try {
      await installWasm(agent, canister.id, canister.name, wasmPath);
      console.log(`   ✅ ${canister.name} installed successfully!`);
      installed++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failed++;
    }

    console.log('');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 INSTALLATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`✅ Successfully Installed: ${installed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log('');

  if (failed === 0 && skipped === 0) {
    console.log('✅ ALL CANISTERS HAVE WASM INSTALLED!');
  } else {
    console.log('⚠️  Some canisters need attention');
  }

  console.log('');
}

main().catch(console.error);
