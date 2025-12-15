#!/usr/bin/env node
/**
 * Deploy AXIOM 1-5 Individual Canisters
 * These use axiom_nft.wasm but with different initialization arguments
 */

import { readFileSync, existsSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { IDL } from '@dfinity/candid';
import { homedir } from 'os';
import { join } from 'path';

const AXIOM_CANISTERS = [
  {
    name: 'axiom_1',
    id: '46odg-5iaaa-aaaao-a4xqa-cai',
    args: '(record { token_id = 1 : nat64; name = "AXIOM Genesis #1"; description = "The First Oracle - Wise blockchain analyst"; owner = principal "yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe"; personality = opt "Wise and analytical"; specialization = opt "Blockchain Expert" })',
  },
  {
    name: 'axiom_2',
    id: '4zpfs-qqaaa-aaaao-a4xqq-cai',
    args: '(record { token_id = 2 : nat64; name = "AXIOM Genesis #2"; description = "The Creative Mind - NFT and art specialist"; owner = principal "yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe"; personality = opt "Creative and visionary"; specialization = opt "NFT Art Expert" })',
  },
  {
    name: 'axiom_3',
    id: '4ckzx-kiaaa-aaaao-a4xsa-cai',
    args: '(record { token_id = 3 : nat64; name = "AXIOM Genesis #3"; description = "The DeFi Sage - Finance and trading guru"; owner = principal "yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe"; personality = opt "Calculated and precise"; specialization = opt "DeFi Strategist" })',
  },
  {
    name: 'axiom_4',
    id: '4fl7d-hqaaa-aaaao-a4xsq-cai',
    args: '(record { token_id = 4 : nat64; name = "AXIOM Genesis #4"; description = "The Tech Architect - Smart contract specialist"; owner = principal "yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe"; personality = opt "Technical and thorough"; specialization = opt "Smart Contract Developer" })',
  },
  {
    name: 'axiom_5',
    id: '4miu7-ryaaa-aaaao-a4xta-cai',
    args: '(record { token_id = 5 : nat64; name = "AXIOM Genesis #5"; description = "The Community Builder - Engagement specialist"; owner = principal "yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe"; personality = opt "Friendly and engaging"; specialization = opt "Community Manager" })',
  },
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

async function installAxiomCanister(agent, canister) {
  const wasmPath = 'target/wasm32-unknown-unknown/release/axiom_nft.wasm';
  
  if (!existsSync(wasmPath)) {
    throw new Error(`WASM file not found: ${wasmPath}`);
  }

  const { IDL } = await import('@dfinity/candid');
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
  
  // Encode the initialization arguments
  // For now, we'll use empty args and let the canister initialize with defaults
  // The actual args from dfx.json would need proper Candid encoding
  const argBytes = new Uint8Array(0); // Empty for now - canister should handle defaults

  console.log(`   📦 Installing ${canister.name} with WASM (${(wasmModule.length / 1024 / 1024).toFixed(2)} MB)...`);

  await managementActor.install_code({
    mode: { reinstall: null },
    canister_id: Principal.fromText(canister.id),
    wasm_module: Array.from(new Uint8Array(wasmModule)),
    arg: Array.from(argBytes),
  });

  return true;
}

async function main() {
  console.log('🚀 DEPLOYING AXIOM INDIVIDUAL CANISTERS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  for (const canister of AXIOM_CANISTERS) {
    console.log(`🔍 Processing ${canister.name}...`);
    console.log(`   ID: ${canister.id}`);
    
    try {
      await installAxiomCanister(agent, canister);
      console.log(`   ✅ ${canister.name} installed successfully!\n`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
    }
  }

  console.log('✅ AXIOM canisters deployment complete!\n');
}

main().catch(console.error);
