export const idlFactory = ({ IDL }) => {
  const AdminConfig = IDL.Record({
    'platform_fee_bps' : IDL.Nat16,
    'treasury_principal' : IDL.Principal,
    'paused' : IDL.Bool,
    'admin_principal' : IDL.Principal,
  });
  const UserRole = IDL.Variant({
    'Driver' : IDL.Null,
    'User' : IDL.Null,
    'Warehouse' : IDL.Null,
    'Admin' : IDL.Null,
    'Shipper' : IDL.Null,
  });
  const WalletAddresses = IDL.Record({
    'btc' : IDL.Opt(IDL.Text),
    'evm' : IDL.Opt(IDL.Text),
    'icp' : IDL.Opt(IDL.Text),
    'sol' : IDL.Opt(IDL.Text),
  });
  const UserProfile = IDL.Record({
    'last_login' : IDL.Nat64,
    'user_principal' : IDL.Principal,
    'kyc_verified' : IDL.Bool,
    'role' : UserRole,
    'created_at' : IDL.Nat64,
    'email' : IDL.Opt(IDL.Text),
    'display_name' : IDL.Text,
    'wallet_addresses' : WalletAddresses,
  });
  return IDL.Service({
    'get_canister_info' : IDL.Func([], [IDL.Text], ['query']),
    'get_config' : IDL.Func([], [AdminConfig], ['query']),
    'get_my_profile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'get_profile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'get_total_users' : IDL.Func([], [IDL.Nat64], ['query']),
    'get_user_role' : IDL.Func([IDL.Principal], [IDL.Opt(UserRole)], ['query']),
    'get_verified_drivers' : IDL.Func([], [IDL.Vec(UserProfile)], ['query']),
    'health' : IDL.Func([], [IDL.Text], ['query']),
    'is_paused' : IDL.Func([], [IDL.Bool], ['query']),
    'register_user' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : UserProfile, 'Err' : IDL.Text })],
        [],
      ),
    'set_kyc_verified' : IDL.Func(
        [IDL.Principal, IDL.Bool],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'set_paused' : IDL.Func(
        [IDL.Bool],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'set_user_role' : IDL.Func(
        [IDL.Principal, UserRole],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_config' : IDL.Func(
        [IDL.Nat16, IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_profile' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : UserProfile, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
