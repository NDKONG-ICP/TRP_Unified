#!/usr/bin/env node
/**
 * Install raven_ai WASM to canister
 * Bypasses dfx color bug
 */

import { readFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

const RAVEN_AI_ID = '3noas-jyaaa-aaaao-a4xda-cai';

function loadIdentity() {
  const pemPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
}

async function checkCanisterExists(agent, canisterId) {
  try {
    const managementIDL = ({ IDL }) => IDL.Service({
      canister_status: IDL.Func(
        [IDL.Record({ canister_id: IDL.Principal })],
        [IDL.Record({
          status: IDL.Variant({
            running: IDL.Null,
            stopping: IDL.Null,
            stopped: IDL.Null,
          }),
          memory_size: IDL.Nat,
          cycles: IDL.Nat,
          settings: IDL.Record({
            controller: IDL.Principal,
            freezing_threshold: IDL.Nat,
            memory_allocation: IDL.Nat,
            compute_allocation: IDL.Nat,
          }),
          module_hash: IDL.Opt(IDL.Vec(IDL.Nat8)),
        })],
        ['query']
      ),
    });

    const managementActor = Actor.createActor(managementIDL, {
      agent,
      canisterId: Principal.fromText('aaaaa-aa'),
    });

    const status = await managementActor.canister_status({
      canister_id: Principal.fromText(canisterId),
    });

    return { exists: true, status };
  } catch (error) {
    if (error.message.includes('canister_not_found')) {
      return { exists: false, error: 'canister_not_found' };
    }
    throw error;
  }
}

async function installWASM(agent, canisterId, wasmModule) {
  const managementIDL = ({ IDL }) => IDL.Service({
    install_code: IDL.Func(
      [
        IDL.Record({
          mode: IDL.Variant({
            reinstall: IDL.Null,
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

  await managementActor.install_code({
    mode: { reinstall: null },
    canister_id: Principal.fromText(canisterId),
    wasm_module: Array.from(new Uint8Array(wasmModule)),
    arg: [],
  });
}

async function main() {
  console.log('🚀 Installing raven_ai WASM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  // Check if canister exists
  console.log('🔍 Checking canister status...');
  const checkResult = await checkCanisterExists(agent, RAVEN_AI_ID);
  
  if (!checkResult.exists) {
    console.error(`❌ Canister ${RAVEN_AI_ID} does NOT exist on mainnet.\n`);
    console.error('💡 You need to create the canister first.');
    process.exit(1);
  }

  console.log('✅ Canister exists!');
  console.log(`   Status: ${Object.keys(checkResult.status.status)[0]}`);
  console.log(`   Cycles: ${(Number(checkResult.status.cycles) / 1e12).toFixed(3)} TC`);
  console.log(`   Memory: ${(Number(checkResult.status.memory_size) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Module hash: ${checkResult.status.module_hash.length > 0 ? 'Present' : 'None (no WASM installed)'}\n`);

  // Load WASM
  const wasmPath = 'target/wasm32-unknown-unknown/release/raven_ai.wasm';
  let wasmModule;
  try {
    wasmModule = readFileSync(wasmPath);
    console.log(`✅ WASM loaded: ${(wasmModule.length / 1024 / 1024).toFixed(2)} MB\n`);
  } catch (error) {
    console.error(`❌ Could not read WASM file: ${wasmPath}`);
    console.error('   Run: cargo build --target wasm32-unknown-unknown --release --package raven_ai');
    process.exit(1);
  }

  // Install WASM
  try {
    console.log('📦 Installing WASM (reinstall mode)...');
    await installWASM(agent, RAVEN_AI_ID, wasmModule);
    console.log('✅ WASM installed successfully!\n');

    // Verify
    console.log('🧪 Verifying installation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const ravenAIIDL = ({ IDL }) => IDL.Service({
      get_article_stats: IDL.Func([], [IDL.Record({
        total_articles: IDL.Nat64,
        next_article_id: IDL.Nat64,
      })], ['query']),
      process_halo_document: IDL.Func(
        [
          IDL.Vec(IDL.Nat8),
          IDL.Text,
          IDL.Variant({
            MLA: IDL.Null,
            APA: IDL.Null,
            Chicago: IDL.Null,
            Harvard: IDL.Null,
            IEEE: IDL.Null,
          }),
          IDL.Record({
            rewrite: IDL.Bool,
            generate_citations: IDL.Bool,
            check_plagiarism: IDL.Bool,
            grammar_check: IDL.Bool,
          }),
        ],
        [IDL.Variant({
          Ok: IDL.Record({
            original_text: IDL.Text,
            formatted_text: IDL.Text,
            works_cited: IDL.Vec(IDL.Text),
            citations_added: IDL.Nat32,
            plagiarism_check: IDL.Opt(IDL.Record({
              is_plagiarized: IDL.Bool,
              plagiarism_percentage: IDL.Float32,
              detected_sources: IDL.Vec(IDL.Record({
                url: IDL.Text,
                matched_text: IDL.Text,
                similarity_score: IDL.Float32,
              })),
            })),
            grammar_suggestions: IDL.Vec(IDL.Record({
              text: IDL.Text,
              suggestion: IDL.Text,
              suggestion_type: IDL.Text,
            })),
          }),
          Err: IDL.Text,
        })],
        []
      ),
    });

    const ravenActor = Actor.createActor(ravenAIIDL, {
      agent,
      canisterId: Principal.fromText(RAVEN_AI_ID),
    });

    const stats = await ravenActor.get_article_stats();
    console.log('✅ raven_ai is WORKING!');
    console.log(`   Total articles: ${stats.total_articles}`);
    console.log(`   Next article ID: ${stats.next_article_id}`);
    console.log(`\n🎉 SUCCESS! raven_ai canister is operational`);
    console.log(`\n✅ HALO feature is ready for testing!`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.message.includes('not a controller')) {
      console.error('\n💡 Identity is not a controller of this canister.');
      console.error(`   Current identity: ${identity.getPrincipal().toText()}`);
      console.error(`   Required controller: ${checkResult.status.settings.controller.toText()}`);
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
