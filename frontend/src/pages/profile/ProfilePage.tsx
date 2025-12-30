import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Save, Camera, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { kipService } from '../../services/kipService';
import { connectPhantom, signMessage as solanaSignMessage } from '../../services/wallets/solana';
import { connectSuiWallet, signMessage as suiSignMessage } from '../../services/wallets/sui';
import bs58 from 'bs58';

export default function ProfilePage() {
  const { isAuthenticated, login, principal, profile, setProfile, identity } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [linked, setLinked] = useState<{ sol?: string[]; sui?: string[] } | null>(null);
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    email: profile?.email || '',
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-gold rounded-3xl p-12 text-center"
        >
          <User className="w-16 h-16 text-gold-400 mx-auto mb-6" />
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Connect to View Profile
          </h2>
          <p className="text-silver-400 mb-8 max-w-md mx-auto">
            Connect with Internet Identity to view and manage your profile
          </p>
          <button onClick={login} className="btn-gold">
            Connect Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In production, save to KIP canister
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProfile({
        ...profile!,
        displayName: formData.displayName,
        email: formData.email,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const loadLinked = async () => {
    if (!identity) return;
    await kipService.init(identity);
    const wallets = await kipService.getMyLinkedWallets();
    setLinked({
      sol: wallets?.solanaPubkeys || [],
      sui: wallets?.suiAddresses || [],
    });
  };

  // Load linked wallets once authenticated
  useEffect(() => {
    if (!isAuthenticated || !identity) return;
    loadLinked().catch((e) => console.error('Failed to load linked wallets:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, identity]);

  function formatSIWSMessageBackend(msg: any): string {
    let formatted = `${msg.domain} wants you to sign in with your Solana account:\n`;
    formatted += `${msg.address}\n\n`;
    if (msg.statement && msg.statement.length > 0) {
      formatted += `${msg.statement[0]}\n\n`;
    }
    formatted += `URI: ${msg.uri}\n`;
    formatted += `Version: ${msg.version}\n`;
    formatted += `Chain ID: ${msg.chain_id}\n`;
    formatted += `Nonce: ${msg.nonce}\n`;
    formatted += `Issued At: ${msg.issued_at}`;
    return formatted;
  }

  function formatSISMessageBackend(msg: any): string {
    let formatted = `${msg.domain} wants you to sign in with your Sui account:\n`;
    formatted += `${msg.address}\n\n`;
    if (msg.statement && msg.statement.length > 0) {
      formatted += `${msg.statement[0]}\n\n`;
    }
    formatted += `URI: ${msg.uri}\n`;
    formatted += `Version: ${msg.version}\n`;
    formatted += `Chain ID: ${msg.chain_id}\n`;
    formatted += `Nonce: ${msg.nonce}\n`;
    formatted += `Issued At: ${msg.issued_at}`;
    return formatted;
  }

  function normalizeSignatureToBase58(sig: string): string {
    if (sig.startsWith('0x')) return sig;
    try {
      // already base58?
      const bytes = bs58.decode(sig);
      if (bytes.length === 64) return sig;
    } catch {
      // fallthrough
    }
    // assume base64 -> base58
    const raw = atob(sig);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bs58.encode(bytes);
  }

  const handleLinkSolana = async () => {
    if (!identity) return;
    setIsLinking('sol');
    setLinkError(null);
    try {
      await kipService.init(identity);
      const challenge = await kipService.startLinkWallet('phantom');
      const payload = challenge.payload;
      const msg0 = payload?.Solana;
      if (!msg0) throw new Error('Unexpected challenge payload for Solana');

      const conn = await connectPhantom();
      const msg = { ...msg0, address: conn.wallet.address };
      const formatted = formatSIWSMessageBackend(msg);
      const sigBytes = await solanaSignMessage(formatted);
      const signature = bs58.encode(sigBytes);

      await kipService.confirmLinkWallet({ Solana: msg }, signature);
      await loadLinked();
    } catch (e: any) {
      setLinkError(e?.message || 'Failed to link Phantom');
    } finally {
      setIsLinking(null);
    }
  };

  const handleLinkSui = async () => {
    if (!identity) return;
    setIsLinking('sui');
    setLinkError(null);
    try {
      await kipService.init(identity);
      const challenge = await kipService.startLinkWallet('sui');
      const payload = challenge.payload;
      const msg0 = payload?.Sui;
      if (!msg0) throw new Error('Unexpected challenge payload for Sui');

      const conn = await connectSuiWallet();
      const addrOrPubkey = conn.wallet.publicKey || conn.wallet.address;
      const msg = { ...msg0, address: addrOrPubkey };
      const formatted = formatSISMessageBackend(msg);
      const rawSig = await suiSignMessage(formatted);
      const signature = normalizeSignatureToBase58(rawSig);

      await kipService.confirmLinkWallet({ Sui: msg }, signature);
      await loadLinked();
    } catch (e: any) {
      setLinkError(e?.message || 'Failed to link Sui');
    } finally {
      setIsLinking(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-display font-bold mb-4">
          <span className="text-white">My</span>{' '}
          <span className="text-gradient-gold">Profile</span>
        </h1>
        <p className="text-silver-400">Manage your account settings</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Avatar Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-1"
        >
          <div className="glass-gold rounded-2xl p-6 text-center">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center text-white text-4xl font-bold">
                {formData.displayName?.charAt(0) || principal?.toText().charAt(0) || '?'}
              </div>
              <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-gold-500 flex items-center justify-center text-raven-black hover:bg-gold-400 transition-colors">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {formData.displayName || 'Anonymous'}
            </h3>
            <p className="text-sm text-silver-500 font-mono truncate">
              {principal?.toText().substring(0, 20)}...
            </p>

            {/* Verification Status */}
            <div className="mt-4 pt-4 border-t border-gold-700/30">
              <div className="flex items-center justify-center gap-2">
                {profile?.kycVerified ? (
                  <>
                    <Shield className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 text-sm">KYC Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 text-sm">Not Verified</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-2"
        >
          <div className="glass-gold rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Profile Information</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-gold-500/20 text-gold-400 rounded-lg hover:bg-gold-500/30 transition-colors"
                >
                  Edit
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-silver-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Display Name */}
              <div>
                <label className="block text-sm text-silver-400 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Enter your display name"
                  className="input disabled:opacity-50"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-silver-400 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Enter your email"
                  className="input disabled:opacity-50"
                />
              </div>

              {/* Principal (Read-only) */}
              <div>
                <label className="block text-sm text-silver-400 mb-2">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Principal ID
                </label>
                <input
                  type="text"
                  value={principal?.toText() || ''}
                  disabled
                  className="input opacity-50 font-mono text-sm"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm text-silver-400 mb-2">Role</label>
                <div className="flex gap-2">
                  <span className="badge-gold capitalize">{profile?.role || 'User'}</span>
                </div>
              </div>

              {/* Save Button */}
              {isEditing && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full btn-gold flex items-center justify-center"
                >
                  {isSaving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Connected Wallets */}
          <div className="glass-gold rounded-2xl p-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">Connected Addresses</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-raven-dark rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-xs">ICP</span>
                  </div>
                  <span className="text-silver-400 text-sm">Internet Computer</span>
                </div>
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex items-center justify-between p-3 bg-raven-dark rounded-xl opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-orange-400 font-bold text-xs">EVM</span>
                  </div>
                  <span className="text-silver-400 text-sm">EVM Chains</span>
                </div>
                <span className="text-xs text-silver-600">Coming Soon</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-raven-dark rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 font-bold text-xs">SOL</span>
                  </div>
                  <span className="text-silver-400 text-sm">Solana</span>
                </div>
                {linked?.sol && linked.sol.length > 0 ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <button
                    onClick={handleLinkSolana}
                    disabled={isLinking === 'sol'}
                    className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs hover:bg-purple-500/30 disabled:opacity-50"
                  >
                    {isLinking === 'sol' ? 'Linking...' : 'Link Phantom'}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-raven-dark rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-cyan-300 font-bold text-xs">SUI</span>
                  </div>
                  <span className="text-silver-400 text-sm">Sui</span>
                </div>
                {linked?.sui && linked.sui.length > 0 ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <button
                    onClick={handleLinkSui}
                    disabled={isLinking === 'sui'}
                    className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-200 text-xs hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    {isLinking === 'sui' ? 'Linking...' : 'Link Sui'}
                  </button>
                )}
              </div>

              {linkError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                  {linkError}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}






