export const idlFactory = ({ IDL }) => {
  const VerificationStatus = IDL.Variant({
    'Approved' : IDL.Null,
    'Rejected' : IDL.Null,
    'Expired' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const UserStats = IDL.Record({
    'sk8_punks_high_score' : IDL.Nat64,
    'nfts_owned' : IDL.Nat64,
    'total_games_played' : IDL.Nat64,
    'memes_uploaded' : IDL.Nat64,
    'total_harlee_earned' : IDL.Nat64,
    'crossword_puzzles_solved' : IDL.Nat64,
    'articles_written' : IDL.Nat64,
  });
  const MailingAddress = IDL.Record({
    'zip' : IDL.Opt(IDL.Text),
    'street' : IDL.Opt(IDL.Text),
    'country' : IDL.Opt(IDL.Text),
    'city' : IDL.Opt(IDL.Text),
    'state' : IDL.Opt(IDL.Text),
  });
  const SocialLinks = IDL.Record({
    'twitter' : IDL.Opt(IDL.Text),
    'instagram' : IDL.Opt(IDL.Text),
    'website' : IDL.Opt(IDL.Text),
    'discord' : IDL.Opt(IDL.Text),
  });
  const KIPProfile = IDL.Record({
    'bio' : IDL.Opt(IDL.Text),
    'user_principal' : IDL.Principal,
    'updated_at' : IDL.Nat64,
    'username' : IDL.Text,
    'banner_url' : IDL.Opt(IDL.Text),
    'newsletter_subscribed' : IDL.Bool,
    'created_at' : IDL.Nat64,
    'profile_picture_url' : IDL.Opt(IDL.Text),
    'email' : IDL.Opt(IDL.Text),
    'preferences' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'verification_status' : VerificationStatus,
    'oisy_wallet_principal' : IDL.Opt(IDL.Principal),
    'display_name' : IDL.Text,
    'stats' : UserStats,
    'address' : IDL.Opt(IDL.Text),
    'verified_at' : IDL.Opt(IDL.Nat64),
    'mailing_address' : IDL.Opt(MailingAddress),
    'phone' : IDL.Opt(IDL.Text),
    'social_links' : SocialLinks,
  });
  const ProfileResult = IDL.Variant({ 'Ok' : KIPProfile, 'Err' : IDL.Text });
  const DocumentType = IDL.Variant({
    'Insurance' : IDL.Null,
    'DOTNumber' : IDL.Null,
    'VehicleRegistration' : IDL.Null,
    'ProofOfAddress' : IDL.Null,
    'DriversLicense' : IDL.Null,
    'Other' : IDL.Text,
    'MCNumber' : IDL.Null,
  });
  const Document = IDL.Record({
    'id' : IDL.Text,
    'status' : VerificationStatus,
    'owner' : IDL.Principal,
    'hash' : IDL.Text,
    'reviewed_at' : IDL.Opt(IDL.Nat64),
    'rejection_reason' : IDL.Opt(IDL.Text),
    'reviewer' : IDL.Opt(IDL.Principal),
    'expires_at' : IDL.Opt(IDL.Nat64),
    'doc_type' : DocumentType,
    'uploaded_at' : IDL.Nat64,
  });
  const VoidResult = IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text });
  const ProfileUpdateRequest = IDL.Record({
    'bio' : IDL.Opt(IDL.Text),
    'banner_url' : IDL.Opt(IDL.Text),
    'newsletter_subscribed' : IDL.Opt(IDL.Bool),
    'profile_picture_url' : IDL.Opt(IDL.Text),
    'email' : IDL.Opt(IDL.Text),
    'display_name' : IDL.Opt(IDL.Text),
    'mailing_address' : IDL.Opt(MailingAddress),
    'phone' : IDL.Opt(IDL.Text),
    'social_links' : IDL.Opt(SocialLinks),
  });
  const StatsResult = IDL.Variant({ 'Ok' : UserStats, 'Err' : IDL.Text });
  return IDL.Service({
    'create_profile' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [ProfileResult],
        [],
      ),
    'get_all_profiles' : IDL.Func([], [IDL.Vec(KIPProfile)], ['query']),
    'get_document' : IDL.Func([IDL.Text], [IDL.Opt(Document)], ['query']),
    'get_leaderboard' : IDL.Func(
        [IDL.Text, IDL.Nat64],
        [IDL.Vec(IDL.Tuple(KIPProfile, IDL.Nat64))],
        ['query'],
      ),
    'get_my_documents' : IDL.Func([], [IDL.Vec(Document)], ['query']),
    'get_my_profile' : IDL.Func([], [IDL.Opt(KIPProfile)], ['query']),
    'get_pending_documents' : IDL.Func([], [IDL.Vec(Document)], ['query']),
    'get_profile' : IDL.Func([IDL.Principal], [IDL.Opt(KIPProfile)], ['query']),
    'get_profile_by_username' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(KIPProfile)],
        ['query'],
      ),
    'get_stats' : IDL.Func(
        [],
        [
          IDL.Record({
            'verified_profiles' : IDL.Nat64,
            'pending_docs' : IDL.Nat64,
            'total_profiles' : IDL.Nat64,
          }),
        ],
        ['query'],
      ),
    'is_username_available' : IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    'review_document' : IDL.Func(
        [IDL.Text, VerificationStatus, IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : Document, 'Err' : IDL.Text })],
        [],
      ),
    'set_admin' : IDL.Func([IDL.Principal], [], []),
    'subscribe_newsletter' : IDL.Func(
        [IDL.Text, IDL.Opt(MailingAddress)],
        [VoidResult],
        [],
      ),
    'update_profile' : IDL.Func(
        [
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
        ],
        [ProfileResult],
        [],
      ),
    'update_profile_v2' : IDL.Func([ProfileUpdateRequest], [ProfileResult], []),
    'update_user_stats' : IDL.Func(
        [
          IDL.Principal,
          IDL.Opt(IDL.Nat64),
          IDL.Opt(IDL.Nat64),
          IDL.Opt(IDL.Nat64),
          IDL.Opt(IDL.Nat64),
          IDL.Opt(IDL.Nat64),
          IDL.Opt(IDL.Nat64),
          IDL.Opt(IDL.Nat64),
        ],
        [StatsResult],
        [],
      ),
    'upload_document' : IDL.Func(
        [DocumentType, IDL.Text],
        [IDL.Variant({ 'Ok' : Document, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
