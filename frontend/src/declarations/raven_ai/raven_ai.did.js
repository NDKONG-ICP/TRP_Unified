export const idlFactory = ({ IDL }) => {
  const ArticleComment = IDL.Record({
    'id' : IDL.Nat64,
    'content' : IDL.Text,
    'edited' : IDL.Bool,
    'author' : IDL.Principal,
    'likes' : IDL.Nat64,
    'timestamp' : IDL.Nat64,
    'article_id' : IDL.Nat64,
  });
  const NotificationType = IDL.Variant({
    'SystemAlert' : IDL.Null,
    'MorningGreeting' : IDL.Null,
    'MiddayUpdate' : IDL.Null,
    'AdminAnnouncement' : IDL.Null,
    'InterAgentMessage' : IDL.Null,
    'EveningMessage' : IDL.Null,
  });
  const RavenNotification = IDL.Record({
    'id' : IDL.Nat32,
    'title' : IDL.Text,
    'scheduled_for' : IDL.Opt(IDL.Nat64),
    'sent' : IDL.Bool,
    'created_at' : IDL.Nat64,
    'sender' : IDL.Text,
    'notification_type' : NotificationType,
    'recipients' : IDL.Vec(IDL.Nat32),
    'message' : IDL.Text,
    'sent_at' : IDL.Opt(IDL.Nat64),
  });
  const MemoryEntry = IDL.Record({
    'id' : IDL.Text,
    'content' : IDL.Text,
    'memory_type' : IDL.Text,
    'tags' : IDL.Vec(IDL.Text),
    'importance' : IDL.Float32,
    'timestamp' : IDL.Nat64,
  });
  const MultichainAddresses = IDL.Record({
    'sol_address' : IDL.Opt(IDL.Text),
    'evm_address' : IDL.Opt(IDL.Text),
    'icp_principal' : IDL.Opt(IDL.Text),
    'btc_address' : IDL.Opt(IDL.Text),
  });
  const ChatMessage = IDL.Record({
    'content' : IDL.Text,
    'role' : IDL.Text,
    'timestamp' : IDL.Nat64,
  });
  const KnowledgeNode = IDL.Record({
    'id' : IDL.Text,
    'node_type' : IDL.Text,
    'properties' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'created_at' : IDL.Nat64,
    'label' : IDL.Text,
    'connections' : IDL.Vec(IDL.Text),
  });
  const AgentType = IDL.Variant({ 'RavenAI' : IDL.Null, 'AXIOM' : IDL.Nat32 });
  const AgentConfig = IDL.Record({
    'personality' : IDL.Text,
    'accessibility_mode' : IDL.Text,
    'custom_instructions' : IDL.Text,
    'name' : IDL.Text,
    'language' : IDL.Text,
    'voice_enabled' : IDL.Bool,
  });
  const RavenAIAgent = IDL.Record({
    'total_memories' : IDL.Nat64,
    'short_term_memory' : IDL.Vec(MemoryEntry),
    'multichain_addresses' : MultichainAddresses,
    'conversation_history' : IDL.Vec(ChatMessage),
    'token_id' : IDL.Nat64,
    'owner' : IDL.Principal,
    'metadata' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'canister_id' : IDL.Opt(IDL.Principal),
    'knowledge_nodes' : IDL.Vec(KnowledgeNode),
    'total_interactions' : IDL.Nat64,
    'created_at' : IDL.Nat64,
    'last_active' : IDL.Nat64,
    'agent_type' : AgentType,
    'long_term_memory' : IDL.Vec(MemoryEntry),
    'config' : AgentConfig,
  });
  const SubscriptionPlan = IDL.Variant({
    'Demo' : IDL.Null,
    'Lifetime' : IDL.Null,
    'Monthly' : IDL.Null,
    'NFTHolder' : IDL.Null,
    'Yearly' : IDL.Null,
  });
  const Subscription = IDL.Record({
    'plan' : SubscriptionPlan,
    'user' : IDL.Principal,
    'payment_history' : IDL.Vec(IDL.Text),
    'is_active' : IDL.Bool,
    'expires_at' : IDL.Opt(IDL.Nat64),
    'started_at' : IDL.Nat64,
  });
  const ArticlePersona = IDL.Variant({
    'Raven' : IDL.Null,
    'Macho' : IDL.Null,
    'Harlee' : IDL.Null,
  });
  const NewsArticle = IDL.Record({
    'id' : IDL.Nat64,
    'title' : IDL.Text,
    'featured' : IDL.Bool,
    'content' : IDL.Text,
    'shares' : IDL.Nat64,
    'harlee_rewards' : IDL.Nat64,
    'views' : IDL.Nat64,
    'slug' : IDL.Text,
    'tags' : IDL.Vec(IDL.Text),
    'published_at' : IDL.Nat64,
    'seo_title' : IDL.Text,
    'author_principal' : IDL.Opt(IDL.Principal),
    'likes' : IDL.Nat64,
    'seo_keywords' : IDL.Vec(IDL.Text),
    'excerpt' : IDL.Text,
    'category' : IDL.Text,
    'seo_description' : IDL.Text,
    'author_persona' : ArticlePersona,
  });
  const PuzzleDifficulty = IDL.Variant({
    'Easy' : IDL.Null,
    'Hard' : IDL.Null,
    'Medium' : IDL.Null,
  });
  const CrosswordClue = IDL.Record({
    'direction' : IDL.Text,
    'clue' : IDL.Text,
    'difficulty' : PuzzleDifficulty,
    'answer' : IDL.Text,
    'number' : IDL.Nat32,
  });
  const CrosswordPuzzle = IDL.Record({
    'id' : IDL.Text,
    'theme' : IDL.Text,
    'title' : IDL.Text,
    'answers' : IDL.Vec(IDL.Tuple(IDL.Nat32, IDL.Nat32, IDL.Text)),
    'difficulty' : PuzzleDifficulty,
    'clues' : IDL.Vec(CrosswordClue),
    'grid_size' : IDL.Nat32,
    'created_at' : IDL.Nat64,
    'rewards_harlee' : IDL.Nat64,
    'rewards_xp' : IDL.Nat32,
    'ai_generated' : IDL.Bool,
  });
  const AxiomNFT = IDL.Record({
    'dedicated_canister' : IDL.Opt(IDL.Principal),
    'agent' : IDL.Opt(RavenAIAgent),
    'token_id' : IDL.Nat64,
    'owner' : IDL.Opt(IDL.Principal),
    'minted' : IDL.Bool,
    'number' : IDL.Nat32,
    'minted_at' : IDL.Opt(IDL.Nat64),
  });
  const LLMProviderConfig = IDL.Record({
    'weight' : IDL.Float32,
    'model' : IDL.Text,
    'temperature' : IDL.Float32,
    'api_key' : IDL.Text,
    'api_url' : IDL.Text,
    'name' : IDL.Text,
    'enabled' : IDL.Bool,
    'max_tokens' : IDL.Nat32,
  });
  const Config = IDL.Record({
    'llm_providers' : IDL.Opt(IDL.Vec(LLMProviderConfig)),
    'total_agents_minted' : IDL.Nat64,
    'total_axiom_minted' : IDL.Nat32,
    'treasury_principal' : IDL.Principal,
    'admins' : IDL.Vec(IDL.Principal),
    'raven_token_canister' : IDL.Principal,
    'next_axiom_number' : IDL.Nat32,
    'btc_address' : IDL.Text,
    'next_token_id' : IDL.Nat64,
    'paused' : IDL.Bool,
  });
  const AICouncilModelResponse = IDL.Record({
    'model' : IDL.Text,
    'error' : IDL.Opt(IDL.Text),
    'response' : IDL.Text,
    'latency_ms' : IDL.Nat64,
    'success' : IDL.Bool,
    'tokens_generated' : IDL.Opt(IDL.Nat32),
  });
  const AICouncilConsensus = IDL.Record({
    'key_points' : IDL.Vec(IDL.Text),
    'dissenting_views' : IDL.Vec(IDL.Text),
    'final_response' : IDL.Text,
    'agreement_level' : IDL.Float32,
    'synthesis_method' : IDL.Text,
    'confidence_score' : IDL.Float32,
  });
  const AICouncilSession = IDL.Record({
    'user_query' : IDL.Text,
    'context' : IDL.Vec(ChatMessage),
    'system_prompt' : IDL.Opt(IDL.Text),
    'total_tokens_used' : IDL.Nat32,
    'session_id' : IDL.Text,
    'responses' : IDL.Vec(AICouncilModelResponse),
    'user' : IDL.Principal,
    'created_at' : IDL.Nat64,
    'total_cost_usd' : IDL.Float64,
    'consensus' : IDL.Opt(AICouncilConsensus),
    'completed_at' : IDL.Opt(IDL.Nat64),
  });
  const PaymentToken = IDL.Variant({
    'BOB' : IDL.Null,
    'ICP' : IDL.Null,
    'NAK' : IDL.Null,
    'SOL' : IDL.Null,
    'SUI' : IDL.Null,
    'MGSN' : IDL.Null,
    'RAVEN' : IDL.Null,
    'CkUSDC' : IDL.Null,
    'CkUSDT' : IDL.Null,
    'ZOMBIE' : IDL.Null,
    'CkBTC' : IDL.Null,
    'CkETH' : IDL.Null,
    'CkSOL' : IDL.Null,
  });
  const PaymentRecord = IDL.Record({
    'id' : IDL.Text,
    'status' : IDL.Text,
    'token' : PaymentToken,
    'token_id' : IDL.Opt(IDL.Nat64),
    'created_at' : IDL.Nat64,
    'usd_value' : IDL.Float64,
    'agent_type' : AgentType,
    'payer' : IDL.Principal,
    'tx_hash' : IDL.Opt(IDL.Text),
    'completed_at' : IDL.Opt(IDL.Nat64),
    'amount' : IDL.Nat64,
  });
  const TokenPrice = IDL.Record({
    'decimals' : IDL.Nat8,
    'token' : PaymentToken,
    'usd_price' : IDL.Float64,
    'amount_for_100_usd' : IDL.Nat64,
  });
  const MintResult = IDL.Record({
    'token_id' : IDL.Nat64,
    'payment_amount' : IDL.Nat64,
    'canister_id' : IDL.Principal,
    'mint_number' : IDL.Nat32,
    'cycles_allocated' : IDL.Nat,
    'payment_token' : PaymentToken,
  });
  const CitationFormat = IDL.Variant({
    'APA' : IDL.Null,
    'MLA' : IDL.Null,
    'Chicago' : IDL.Null,
    'IEEE' : IDL.Null,
    'Harvard' : IDL.Null,
  });
  const HALOOptions = IDL.Record({
    'generate_citations' : IDL.Bool,
    'check_plagiarism' : IDL.Bool,
    'grammar_check' : IDL.Bool,
    'rewrite' : IDL.Bool,
  });
  const GrammarSuggestion = IDL.Record({
    'text' : IDL.Text,
    'suggestion' : IDL.Text,
    'suggestion_type' : IDL.Text,
  });
  const PlagiarismMatch = IDL.Record({
    'matched_text' : IDL.Text,
    'author' : IDL.Opt(IDL.Text),
    'source_url' : IDL.Text,
    'source_title' : IDL.Opt(IDL.Text),
    'similarity_score' : IDL.Float32,
    'publish_date' : IDL.Opt(IDL.Text),
  });
  const PlagiarismCheckResult = IDL.Record({
    'matches' : IDL.Vec(PlagiarismMatch),
    'plagiarism_percentage' : IDL.Float32,
    'is_plagiarized' : IDL.Bool,
  });
  const HALOResult = IDL.Record({
    'citations_added' : IDL.Nat32,
    'works_cited' : IDL.Vec(IDL.Text),
    'grammar_suggestions' : IDL.Vec(GrammarSuggestion),
    'plagiarism_check' : IDL.Opt(PlagiarismCheckResult),
    'formatted_text' : IDL.Text,
    'original_text' : IDL.Text,
  });
  const SharedMemory = IDL.Record({
    'id' : IDL.Text,
    'content' : IDL.Text,
    'memory_type' : IDL.Text,
    'tags' : IDL.Vec(IDL.Text),
    'importance' : IDL.Float32,
    'created_at' : IDL.Nat64,
    'source_agent' : IDL.Nat32,
    'access_count' : IDL.Nat64,
  });
  const VoiceSynthesisRequest = IDL.Record({
    'similarity_boost' : IDL.Opt(IDL.Float32),
    'text' : IDL.Text,
    'stability' : IDL.Opt(IDL.Float32),
    'voice_id' : IDL.Opt(IDL.Text),
    'model_id' : IDL.Opt(IDL.Text),
  });
  const VoiceSynthesisResponse = IDL.Record({
    'audio_data' : IDL.Vec(IDL.Nat8),
    'content_type' : IDL.Text,
  });
  return IDL.Service({
    'add_article_comment' : IDL.Func(
        [IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : ArticleComment, 'Err' : IDL.Text })],
        [],
      ),
    'add_chat_message' : IDL.Func(
        [IDL.Nat64, IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'add_memory' : IDL.Func(
        [IDL.Nat64, IDL.Text, IDL.Text, IDL.Float32, IDL.Vec(IDL.Text)],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'admin_add_principal' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'admin_get_all_notifications' : IDL.Func(
        [IDL.Nat32, IDL.Nat32],
        [IDL.Vec(RavenNotification)],
        ['query'],
      ),
    'admin_pause' : IDL.Func(
        [IDL.Bool],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'admin_send_notification' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Vec(IDL.Nat32)],
        [IDL.Variant({ 'Ok' : RavenNotification, 'Err' : IDL.Text })],
        [],
      ),
    'admin_set_eleven_labs_api_key' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'admin_set_llm_api_key' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'admin_upload_axiom_wasm' : IDL.Func(
        [IDL.Vec(IDL.Nat8)],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'airdrop_axiom' : IDL.Func(
        [IDL.Nat32, IDL.Principal],
        [IDL.Variant({ 'Ok' : RavenAIAgent, 'Err' : IDL.Text })],
        [],
      ),
    'chat' : IDL.Func(
        [IDL.Opt(IDL.Nat64), IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'check_subscription' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(Subscription)],
        ['query'],
      ),
    'confirm_payment' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : RavenAIAgent, 'Err' : IDL.Text })],
        [],
      ),
    'create_article' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Text,
          IDL.Text,
          ArticlePersona,
          IDL.Text,
          IDL.Vec(IDL.Text),
          IDL.Text,
          IDL.Text,
          IDL.Vec(IDL.Text),
          IDL.Bool,
        ],
        [IDL.Variant({ 'Ok' : NewsArticle, 'Err' : IDL.Text })],
        [],
      ),
    'distribute_article_harlee_rewards' : IDL.Func(
        [IDL.Nat64, IDL.Principal, IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'generate_crossword_puzzle' : IDL.Func(
        [IDL.Text, PuzzleDifficulty],
        [IDL.Variant({ 'Ok' : CrosswordPuzzle, 'Err' : IDL.Text })],
        [],
      ),
    'generate_daily_article' : IDL.Func(
        [ArticlePersona, IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : NewsArticle, 'Err' : IDL.Text })],
        [],
      ),
    'get_agent' : IDL.Func([IDL.Nat64], [IDL.Opt(RavenAIAgent)], ['query']),
    'get_agents_by_owner' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(RavenAIAgent)],
        ['query'],
      ),
    'get_article' : IDL.Func([IDL.Nat64], [IDL.Opt(NewsArticle)], ['query']),
    'get_article_comments' : IDL.Func(
        [IDL.Nat64],
        [IDL.Vec(ArticleComment)],
        ['query'],
      ),
    'get_articles' : IDL.Func(
        [IDL.Nat32, IDL.Nat32],
        [IDL.Vec(NewsArticle)],
        ['query'],
      ),
    'get_axiom' : IDL.Func([IDL.Nat32], [IDL.Opt(AxiomNFT)], ['query']),
    'get_axiom_availability' : IDL.Func(
        [],
        [IDL.Nat32, IDL.Nat32, IDL.Vec(IDL.Nat32)],
        ['query'],
      ),
    'get_btc_address' : IDL.Func([], [IDL.Text], ['query']),
    'get_collective_stats' : IDL.Func(
        [],
        [IDL.Nat64, IDL.Nat64, IDL.Nat64],
        ['query'],
      ),
    'get_config' : IDL.Func([], [Config], ['query']),
    'get_conversation_history' : IDL.Func(
        [IDL.Nat64, IDL.Nat32],
        [IDL.Vec(ChatMessage)],
        ['query'],
      ),
    'get_council_session' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(AICouncilSession)],
        ['query'],
      ),
    'get_crossword_puzzle' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(CrosswordPuzzle)],
        ['query'],
      ),
    'get_llm_providers' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Bool))],
        ['query'],
      ),
    'get_payment' : IDL.Func([IDL.Text], [IDL.Opt(PaymentRecord)], ['query']),
    'get_pending_notifications' : IDL.Func(
        [IDL.Nat32],
        [IDL.Vec(RavenNotification)],
        ['query'],
      ),
    'get_recent_crossword_puzzles' : IDL.Func(
        [IDL.Nat32],
        [IDL.Vec(CrosswordPuzzle)],
        ['query'],
      ),
    'get_scheduled_notifications' : IDL.Func(
        [IDL.Text],
        [IDL.Vec(RavenNotification)],
        ['query'],
      ),
    'get_subscription_pricing' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat64))],
        ['query'],
      ),
    'get_token_prices_info' : IDL.Func([], [IDL.Vec(TokenPrice)], ['query']),
    'get_total_supply' : IDL.Func([], [IDL.Nat64, IDL.Nat32], ['query']),
    'get_user_council_sessions' : IDL.Func(
        [IDL.Principal, IDL.Nat32],
        [IDL.Vec(AICouncilSession)],
        ['query'],
      ),
    'health' : IDL.Func([], [IDL.Text], ['query']),
    'increment_article_views' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'init_notification_system' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat32, 'Err' : IDL.Text })],
        [],
      ),
    'initiate_payment' : IDL.Func(
        [PaymentToken, IDL.Text, IDL.Opt(IDL.Nat32)],
        [IDL.Variant({ 'Ok' : PaymentRecord, 'Err' : IDL.Text })],
        [],
      ),
    'like_article' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'like_comment' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'mark_notification_read' : IDL.Func(
        [IDL.Nat32, IDL.Nat32],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'mint_axiom_agent' : IDL.Func(
        [PaymentToken, IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : MintResult, 'Err' : IDL.Text })],
        [],
      ),
    'process_halo_document' : IDL.Func(
        [IDL.Vec(IDL.Nat8), IDL.Text, CitationFormat, HALOOptions],
        [IDL.Variant({ 'Ok' : HALOResult, 'Err' : IDL.Text })],
        [],
      ),
    'process_scheduled_notifications' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat32, 'Err' : IDL.Text })],
        [],
      ),
    'purchase_subscription' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : Subscription, 'Err' : IDL.Text })],
        [],
      ),
    'query_ai_council' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Text), IDL.Vec(ChatMessage), IDL.Opt(IDL.Nat64)],
        [IDL.Variant({ 'Ok' : AICouncilSession, 'Err' : IDL.Text })],
        [],
      ),
    'query_shared_memories' : IDL.Func(
        [IDL.Text, IDL.Nat32],
        [IDL.Vec(SharedMemory)],
        ['query'],
      ),
    'recall_memories' : IDL.Func(
        [IDL.Nat64, IDL.Text, IDL.Nat32],
        [IDL.Vec(MemoryEntry)],
        ['query'],
      ),
    'regenerate_article' : IDL.Func(
        [IDL.Nat64, IDL.Opt(ArticlePersona), IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : NewsArticle, 'Err' : IDL.Text })],
        [],
      ),
    'renew_subscription' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : Subscription, 'Err' : IDL.Text })],
        [],
      ),
    'send_inter_agent_message' : IDL.Func(
        [IDL.Nat32, IDL.Nat32, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'share_article' : IDL.Func(
        [IDL.Nat64],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'share_memory_to_collective' : IDL.Func(
        [IDL.Nat32, IDL.Text, IDL.Text, IDL.Float32, IDL.Vec(IDL.Text)],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'start_demo' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : Subscription, 'Err' : IDL.Text })],
        [],
      ),
    'sync_agent_learnings' : IDL.Func(
        [IDL.Nat32],
        [IDL.Variant({ 'Ok' : IDL.Nat32, 'Err' : IDL.Text })],
        [],
      ),
    'synthesize_voice' : IDL.Func(
        [VoiceSynthesisRequest],
        [IDL.Variant({ 'Ok' : VoiceSynthesisResponse, 'Err' : IDL.Text })],
        [],
      ),
    'top_up_axiom_cycles' : IDL.Func(
        [IDL.Principal, PaymentToken, IDL.Nat64, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'transfer_agent' : IDL.Func(
        [IDL.Nat64, IDL.Principal],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'trigger_article_generation' : IDL.Func(
        [ArticlePersona, IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : NewsArticle, 'Err' : IDL.Text })],
        [],
      ),
    'update_agent_config' : IDL.Func(
        [IDL.Nat64, AgentConfig],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_multichain_address' : IDL.Func(
        [IDL.Nat64, IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'upload_axiom_document' : IDL.Func(
        [IDL.Nat64, IDL.Text, IDL.Vec(IDL.Nat8), IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'verify_crossword_solution' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Tuple(IDL.Nat32, IDL.Nat32, IDL.Text))],
        [
          IDL.Variant({
            'Ok' : IDL.Tuple(IDL.Bool, IDL.Nat64, IDL.Nat32),
            'Err' : IDL.Text,
          }),
        ],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
