import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Upload, 
  Sparkles, 
  Loader2, 
  Check, 
  AlertCircle,
  Layers,
  Globe,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ICSpicyMintService } from '../../services/icSpicyMintService';
import { Principal } from '@dfinity/principal';

interface MintConfig {
  quantity: number;
  recipient: string;
  chain: 'icp' | 'evm' | 'btc' | 'sol';
  standard: 'icrc7' | 'ext';
}

const chains = [
  { id: 'icp', name: 'Internet Computer', icon: '∞', color: 'from-blue-500 to-purple-600' },
  { id: 'evm', name: 'EVM (Ethereum)', icon: '⟠', color: 'from-blue-400 to-indigo-600' },
  { id: 'btc', name: 'Bitcoin (Ordinals)', icon: '₿', color: 'from-orange-500 to-yellow-500' },
  { id: 'sol', name: 'Solana', icon: '◎', color: 'from-purple-500 to-pink-500' },
];

const standards = [
  { id: 'icrc7', name: 'ICRC-7/ICRC-37', description: 'Native ICP standard' },
  { id: 'ext', name: 'EXT (DIP721)', description: 'Extended standard' },
];

export default function MintPage() {
  const { isAuthenticated, login, principal, profile } = useAuthStore();
  const [config, setConfig] = useState<MintConfig>({
    quantity: 1,
    recipient: '',
    chain: 'icp',
    standard: 'icrc7',
  });
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ success: boolean; message: string; tokenIds?: string[] } | null>(null);

  const isAdmin = profile?.role === 'admin';
  const maxQuantity = isAdmin ? 100 : 10;

  const handleMint = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }

    setIsMinting(true);
    setMintResult(null);

    try {
      // Only support ICP chain with IC SPICY for now
      if (config.chain !== 'icp') {
        throw new Error('IC SPICY minting is only available on ICP chain');
      }

      let result;
      if (config.quantity === 1) {
        // Single mint
        const recipient = config.recipient 
          ? Principal.fromText(config.recipient)
          : principal 
          ? Principal.fromText(principal.toString())
          : undefined;
        
        result = await ICSpicyMintService.mint(recipient);
      } else {
        // Batch mint
        const recipient = config.recipient 
          ? Principal.fromText(config.recipient)
          : principal 
          ? Principal.fromText(principal.toString())
          : undefined;
        
        result = await ICSpicyMintService.batchMint({
          recipient,
          quantity: config.quantity,
        });
      }

      if (result.success) {
        setMintResult({
          success: true,
          message: `Successfully minted ${result.token_ids.length} NFT(s)!`,
          tokenIds: result.token_ids.map(id => id.toString()),
        });
        
        // Reset recipient field after successful mint
        setConfig({ ...config, recipient: '' });
      } else {
        throw new Error('Minting failed - no tokens were minted');
      }
    } catch (error) {
      console.error('Minting error:', error);
      setMintResult({
        success: false,
        message: error instanceof Error ? error.message : 'Minting failed',
      });
    } finally {
      setIsMinting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-12 text-center border border-spicy-orange/20"
        >
          <Wallet className="w-16 h-16 text-spicy-orange mx-auto mb-6" />
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Connect to Mint
          </h2>
          <p className="text-silver-400 mb-8 max-w-md mx-auto">
            Connect your wallet with Internet Identity to start minting unique NFTs
          </p>
          <button onClick={login} className="btn-gold">
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-display font-bold mb-4">
          <span className="text-white">Mint</span>{' '}
          <span className="text-spicy-orange">NFTs</span>
        </h1>
        <p className="text-silver-400 max-w-2xl mx-auto">
          Generate unique NFTs from the IC Spicy collection with multi-chain support
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Chain Selection */}
          <div className="glass rounded-2xl p-6 border border-spicy-orange/20">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Globe className="w-5 h-5 text-spicy-orange mr-2" />
              Select Chain
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {chains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => setConfig({ ...config, chain: chain.id as MintConfig['chain'] })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    config.chain === chain.id
                      ? 'border-spicy-orange bg-spicy-orange/10'
                      : 'border-raven-gray hover:border-spicy-orange/50'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{chain.icon}</span>
                  <span className="text-sm font-medium text-white">{chain.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Standard Selection (ICP only) */}
          {config.chain === 'icp' && (
            <div className="glass rounded-2xl p-6 border border-spicy-orange/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Layers className="w-5 h-5 text-spicy-orange mr-2" />
                NFT Standard
              </h3>
              <div className="space-y-3">
                {standards.map((standard) => (
                  <button
                    key={standard.id}
                    onClick={() => setConfig({ ...config, standard: standard.id as MintConfig['standard'] })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      config.standard === standard.id
                        ? 'border-spicy-orange bg-spicy-orange/10'
                        : 'border-raven-gray hover:border-spicy-orange/50'
                    }`}
                  >
                    <span className="font-medium text-white block">{standard.name}</span>
                    <span className="text-sm text-silver-500">{standard.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="glass rounded-2xl p-6 border border-spicy-orange/20">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Sparkles className="w-5 h-5 text-spicy-orange mr-2" />
              Quantity
            </h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setConfig({ ...config, quantity: Math.max(1, config.quantity - 1) })}
                className="w-12 h-12 rounded-xl bg-raven-dark border border-raven-gray hover:border-spicy-orange text-white font-bold transition-all"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={maxQuantity}
                value={config.quantity}
                onChange={(e) => setConfig({ ...config, quantity: Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)) })}
                className="flex-1 input text-center text-2xl font-bold"
              />
              <button
                onClick={() => setConfig({ ...config, quantity: Math.min(maxQuantity, config.quantity + 1) })}
                className="w-12 h-12 rounded-xl bg-raven-dark border border-raven-gray hover:border-spicy-orange text-white font-bold transition-all"
              >
                +
              </button>
            </div>
            <p className="text-xs text-silver-500 mt-2 text-center">
              Max {maxQuantity} per transaction {isAdmin && '(Admin)'}
            </p>
          </div>

          {/* Recipient (Admin only) */}
          {isAdmin && (
            <div className="glass rounded-2xl p-6 border border-gold-500/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Wallet className="w-5 h-5 text-gold-400 mr-2" />
                Recipient (Admin)
              </h3>
              <input
                type="text"
                placeholder="Principal ID or leave empty for self"
                value={config.recipient}
                onChange={(e) => setConfig({ ...config, recipient: e.target.value })}
                className="input"
              />
            </div>
          )}
        </motion.div>

        {/* Preview & Mint */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {/* Preview */}
          <div className="glass rounded-2xl p-6 border border-spicy-orange/20">
            <h3 className="text-lg font-bold text-white mb-4">Preview</h3>
            <div className="aspect-square rounded-xl bg-gradient-to-br from-spicy-red/20 to-spicy-orange/20 border border-spicy-orange/30 flex items-center justify-center mb-4">
              <div className="text-center">
                <span className="text-6xl mb-4 block">🌶️</span>
                <p className="text-silver-400">Generative Preview</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-silver-500">Chain</span>
                <span className="text-white">{chains.find(c => c.id === config.chain)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-silver-500">Standard</span>
                <span className="text-white">{config.chain === 'icp' ? standards.find(s => s.id === config.standard)?.name : 'Native'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-silver-500">Quantity</span>
                <span className="text-white">{config.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-silver-500">Recipient</span>
                <span className="text-white font-mono text-xs truncate max-w-[150px] sm:max-w-[200px]">
                  {config.recipient || principal?.toText() || 'Self'}
                </span>
              </div>
            </div>
          </div>

          {/* Mint Button */}
          <button
            onClick={handleMint}
            disabled={isMinting}
            className="w-full py-4 bg-gradient-to-r from-spicy-red to-spicy-orange hover:from-spicy-orange hover:to-spicy-flame text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isMinting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Minting...
              </>
            ) : (
              <>
                <Palette className="w-5 h-5 mr-2" />
                Mint {config.quantity} NFT{config.quantity > 1 ? 's' : ''}
              </>
            )}
          </button>

          {/* Result */}
          {mintResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl p-4 ${
                mintResult.success
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}
            >
              <div className="flex items-start">
                {mintResult.success ? (
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                )}
                <div>
                  <p className={mintResult.success ? 'text-green-400' : 'text-red-400'}>
                    {mintResult.message}
                  </p>
                  {mintResult.tokenIds && (
                    <div className="mt-2 space-y-1">
                      {mintResult.tokenIds.slice(0, 3).map((id) => (
                        <p key={id} className="text-xs text-silver-500 font-mono">{id}</p>
                      ))}
                      {mintResult.tokenIds.length > 3 && (
                        <p className="text-xs text-silver-500">
                          +{mintResult.tokenIds.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}




