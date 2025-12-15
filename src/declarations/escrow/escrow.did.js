export const idlFactory = ({ IDL }) => {
  const CreateEscrowArgs = IDL.Record({
    'load_id' : IDL.Text,
    'metadata' : IDL.Text,
    'warehouse' : IDL.Opt(IDL.Principal),
    'amount' : IDL.Nat64,
    'driver' : IDL.Principal,
  });
  const EscrowStatus = IDL.Variant({
    'Disputed' : IDL.Null,
    'InTransit' : IDL.Null,
    'Refunded' : IDL.Null,
    'PickupConfirmed' : IDL.Null,
    'Released' : IDL.Null,
    'Funded' : IDL.Null,
    'Cancelled' : IDL.Null,
    'DeliveryConfirmed' : IDL.Null,
    'Created' : IDL.Null,
  });
  const Escrow = IDL.Record({
    'id' : IDL.Text,
    'shipper' : IDL.Principal,
    'status' : EscrowStatus,
    'load_id' : IDL.Text,
    'updated_at' : IDL.Nat64,
    'delivery_qr' : IDL.Text,
    'nft_token_id' : IDL.Opt(IDL.Nat64),
    'metadata' : IDL.Text,
    'pickup_qr' : IDL.Text,
    'created_at' : IDL.Nat64,
    'delivery_confirmed_at' : IDL.Opt(IDL.Nat64),
    'pickup_confirmed_at' : IDL.Opt(IDL.Nat64),
    'warehouse' : IDL.Opt(IDL.Principal),
    'amount' : IDL.Nat64,
    'driver' : IDL.Principal,
    'platform_fee' : IDL.Nat64,
  });
  const EscrowConfig = IDL.Record({
    'auto_release_delay' : IDL.Nat64,
    'admin' : IDL.Principal,
    'treasury_canister' : IDL.Principal,
    'platform_fee_bps' : IDL.Nat16,
    'nft_canister' : IDL.Principal,
  });
  const QRVerification = IDL.Record({
    'verified_at' : IDL.Opt(IDL.Nat64),
    'verified_by' : IDL.Opt(IDL.Principal),
    'verification_type' : IDL.Text,
    'escrow_id' : IDL.Text,
    'qr_code' : IDL.Text,
    'location' : IDL.Opt(IDL.Text),
  });
  return IDL.Service({
    'create_escrow' : IDL.Func(
        [CreateEscrowArgs],
        [IDL.Variant({ 'Ok' : Escrow, 'Err' : IDL.Text })],
        [],
      ),
    'dispute_escrow' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : Escrow, 'Err' : IDL.Text })],
        [],
      ),
    'fund_escrow' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : Escrow, 'Err' : IDL.Text })],
        [],
      ),
    'get_config' : IDL.Func([], [EscrowConfig], ['query']),
    'get_escrow' : IDL.Func([IDL.Text], [IDL.Opt(Escrow)], ['query']),
    'get_escrows_by_status' : IDL.Func(
        [EscrowStatus],
        [IDL.Vec(Escrow)],
        ['query'],
      ),
    'get_my_escrows' : IDL.Func([], [IDL.Vec(Escrow)], ['query']),
    'health' : IDL.Func([], [IDL.Text], ['query']),
    'release_payment' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : Escrow, 'Err' : IDL.Text })],
        [],
      ),
    'resolve_dispute' : IDL.Func(
        [IDL.Text, IDL.Bool],
        [IDL.Variant({ 'Ok' : Escrow, 'Err' : IDL.Text })],
        [],
      ),
    'update_config' : IDL.Func(
        [IDL.Nat16, IDL.Principal, IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'verify_qr' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : Escrow, 'Err' : IDL.Text })],
        [],
      ),
    'verify_qr_code' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(QRVerification)],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
