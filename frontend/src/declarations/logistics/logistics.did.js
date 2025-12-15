export const idlFactory = ({ IDL }) => {
  const LoadStatus = IDL.Variant({
    'InTransit' : IDL.Null,
    'Posted' : IDL.Null,
    'Delivered' : IDL.Null,
    'PickedUp' : IDL.Null,
    'Bidding' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Assigned' : IDL.Null,
    'Completed' : IDL.Null,
  });
  const LoadType = IDL.Variant({
    'DryVan' : IDL.Null,
    'Container' : IDL.Null,
    'Flatbed' : IDL.Null,
    'Tanker' : IDL.Null,
    'Other' : IDL.Text,
    'Refrigerated' : IDL.Null,
  });
  const Load = IDL.Record({
    'id' : IDL.Text,
    'weight' : IDL.Text,
    'shipper' : IDL.Principal,
    'status' : LoadStatus,
    'updated_at' : IDL.Nat64,
    'destination' : IDL.Text,
    'delivery_date' : IDL.Text,
    'origin' : IDL.Text,
    'rate' : IDL.Nat64,
    'description' : IDL.Text,
    'created_at' : IDL.Nat64,
    'distance' : IDL.Text,
    'pickup_date' : IDL.Text,
    'load_type' : LoadType,
    'assigned_driver' : IDL.Opt(IDL.Principal),
    'escrow_id' : IDL.Opt(IDL.Text),
  });
  const Bid = IDL.Record({
    'id' : IDL.Text,
    'eta' : IDL.Text,
    'status' : IDL.Text,
    'load_id' : IDL.Text,
    'created_at' : IDL.Nat64,
    'message' : IDL.Text,
    'amount' : IDL.Nat64,
    'driver' : IDL.Principal,
  });
  const LogisticsConfig = IDL.Record({
    'admin' : IDL.Principal,
    'kip_canister' : IDL.Principal,
    'escrow_canister' : IDL.Principal,
  });
  const PostLoadArgs = IDL.Record({
    'weight' : IDL.Text,
    'destination' : IDL.Text,
    'delivery_date' : IDL.Text,
    'origin' : IDL.Text,
    'rate' : IDL.Nat64,
    'description' : IDL.Text,
    'distance' : IDL.Text,
    'pickup_date' : IDL.Text,
    'load_type' : LoadType,
  });
  return IDL.Service({
    'accept_bid' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : Load, 'Err' : IDL.Text })],
        [],
      ),
    'get_available_loads' : IDL.Func([], [IDL.Vec(Load)], ['query']),
    'get_bids_for_load' : IDL.Func([IDL.Text], [IDL.Vec(Bid)], ['query']),
    'get_config' : IDL.Func([], [LogisticsConfig], ['query']),
    'get_load' : IDL.Func([IDL.Text], [IDL.Opt(Load)], ['query']),
    'get_my_bids' : IDL.Func([], [IDL.Vec(Bid)], ['query']),
    'get_my_loads' : IDL.Func([], [IDL.Vec(Load)], ['query']),
    'get_total_loads' : IDL.Func([], [IDL.Nat64], ['query']),
    'health' : IDL.Func([], [IDL.Text], ['query']),
    'place_bid' : IDL.Func(
        [IDL.Text, IDL.Nat64, IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : Bid, 'Err' : IDL.Text })],
        [],
      ),
    'post_load' : IDL.Func(
        [PostLoadArgs],
        [IDL.Variant({ 'Ok' : Load, 'Err' : IDL.Text })],
        [],
      ),
    'update_load_status' : IDL.Func(
        [IDL.Text, LoadStatus],
        [IDL.Variant({ 'Ok' : Load, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
