export const idlFactory = ({ IDL }) => {
  const LeaderboardEntry = IDL.Record({
    'total_rewards_earned' : IDL.Nat64,
    'rank' : IDL.Nat32,
    'user' : IDL.Principal,
    'total_staked' : IDL.Nat32,
  });
  const StakedNFT = IDL.Record({
    'multiplier' : IDL.Float32,
    'token_id' : IDL.Nat64,
    'collection' : IDL.Text,
    'owner' : IDL.Principal,
    'staked_at' : IDL.Nat64,
    'rarity' : IDL.Text,
    'last_claim_at' : IDL.Nat64,
    'pending_rewards' : IDL.Nat64,
  });
  return IDL.Service({
    'claim_rewards' : IDL.Func(
        [IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'distribute_rewards' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat32, 'Err' : IDL.Text })],
        [],
      ),
    'get_leaderboard' : IDL.Func(
        [IDL.Nat32],
        [IDL.Vec(LeaderboardEntry)],
        ['query'],
      ),
    'get_pending_rewards' : IDL.Func([IDL.Principal], [IDL.Nat64], ['query']),
    'get_staked_nfts' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(StakedNFT)],
        ['query'],
      ),
    'set_harlee_ledger' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'stake_nft' : IDL.Func(
        [IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : StakedNFT, 'Err' : IDL.Text })],
        [],
      ),
    'unstake_nft' : IDL.Func(
        [IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
