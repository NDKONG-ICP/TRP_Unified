import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Save, Camera, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export default function ProfilePage() {
  const { isAuthenticated, login, principal, profile, setProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
              <div className="flex items-center justify-between p-3 bg-raven-dark rounded-xl opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 font-bold text-xs">SOL</span>
                  </div>
                  <span className="text-silver-400 text-sm">Solana</span>
                </div>
                <span className="text-xs text-silver-600">Coming Soon</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}






