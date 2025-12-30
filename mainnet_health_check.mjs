#!/usr/bin/env node
/**
 * Mainnet health check for Raven Unified Ecosystem canisters.
 *
 * Calls a minimal `health: () -> (text) query` interface on canisters that expose it.
 * This is a lightweight pre-flight to catch wrong canister IDs / routing issues.
 */

import { HttpAgent, Actor } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';

const HOST = 'https://ic0.app';

// Source of truth should match: frontend/src/services/canisterConfig.ts and canister_ids.json
const CANISTERS = [
  { name: 'kip', id: '3yjr7-iqaaa-aaaao-a4xaq-cai' },
  { name: 'nft', id: '37ixl-fiaaa-aaaao-a4xaa-cai' },
  { name: 'treasury', id: '3rk2d-6yaaa-aaaao-a4xba-cai' },
  { name: 'raven_ai', id: '3noas-jyaaa-aaaao-a4xda-cai' },
  { name: 'icspicy', id: 'vmcfj-haaaa-aaaao-a4o3q-cai' },
  { name: 'logistics', id: '3dmn2-siaaa-aaaao-a4xca-cai' },
  { name: 'staking', id: 'inutw-jiaaa-aaaao-a4yja-cai' },
];

function makeHealthIdl() {
  return ({ IDL }) =>
    IDL.Service({
      health: IDL.Func([], [IDL.Text], ['query']),
    });
}

function classifyError(message) {
  const msg = String(message || '');
  if (msg.includes('IC0536') || msg.includes("no query method 'health'")) return 'NO_HEALTH_METHOD';
  if (msg.includes('IC0537') || msg.includes('contains no Wasm module')) return 'NO_WASM';
  return 'ERROR';
}

async function main() {
  const agent = new HttpAgent({ host: HOST });

  console.log(`\nMainnet health check via ${HOST}\n`);

  for (const c of CANISTERS) {
    process.stdout.write(`- ${c.name} (${c.id}): `);
    try {
      // Create a fresh idlFactory per canister to avoid any caching surprises.
      const idlFactory = makeHealthIdl();
      const canisterId = Principal.fromText(c.id);
      const actor = Actor.createActor(idlFactory, { agent, canisterId });
      const res = await actor.health();
      console.log(res);
    } catch (e) {
      const msg = String(e?.message || e);
      const kind = classifyError(msg);
      if (kind === 'NO_HEALTH_METHOD') {
        console.log('SKIP (no health method)');
      } else if (kind === 'NO_WASM') {
        console.log('ERROR (no wasm installed)');
        console.error(`  ${msg}`);
      } else {
        console.log('ERROR');
        console.error(`  ${msg}`);
      }
    }
  }

  console.log('\nDone.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


