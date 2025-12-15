/**
 * User Onboarding Flow
 * Beautiful multi-step onboarding with username, profile picture, banner, and mailing list
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Image,
  Mail,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  Sparkles,
  Camera,
  Instagram,
  Twitter,
  Globe,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

// Brand assets
import tokenLogo from '../token.svg';

// Social links
const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/raven_icp',
  tiktok: 'https://www.tiktok.com/@the.raven.project',
  twitter: 'https://x.com/ravenicp',
};

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onClose: () => void;
}

interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  profilePictureUrl?: string;
  bannerUrl?: string;
  email?: string;
  mailingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  newsletterSubscribed: boolean;
}

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'username', title: 'Username', icon: User },
  { id: 'profile', title: 'Profile', icon: Image },
  { id: 'newsletter', title: 'Newsletter', icon: Mail },
  { id: 'complete', title: 'Complete', icon: Check },
];

export default function Onboarding({ onComplete, onClose }: OnboardingProps) {
  const { profile: authProfile } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Profile state
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);
  const [mailingAddress, setMailingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });
  
  const profilePicRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  
  // Debounced username check
  useEffect(() => {
    if (username.length >= 3) {
      setCheckingUsername(true);
      const timer = setTimeout(async () => {
        // In production, call the canister to check availability
        // For now, simulate the check
        await new Promise(resolve => setTimeout(resolve, 500));
        const available = !['admin', 'raven', 'system', 'moderator'].includes(username.toLowerCase());
        setUsernameAvailable(available);
        setCheckingUsername(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setUsernameAvailable(null);
    }
  }, [username]);
  
  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile picture must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Banner must be less than 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };
  
  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'username':
        return username.length >= 3 && usernameAvailable === true;
      case 'profile':
        return displayName.length > 0;
      case 'newsletter':
        return true;
      default:
        return true;
    }
  };
  
  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const profile: UserProfile = {
        username,
        displayName,
        bio,
        profilePictureUrl: profilePicture || undefined,
        bannerUrl: bannerImage || undefined,
        email: email || undefined,
        mailingAddress: mailingAddress.street ? mailingAddress : undefined,
        newsletterSubscribed: subscribeNewsletter,
      };
      
      // If subscribed to newsletter, send email notification
      if (subscribeNewsletter && email) {
        try {
          // In production, this would call a backend service or use EmailJS
          console.log('Newsletter signup:', { email, mailingAddress, username });
          // Send to raven.icp@gmail.com (would need a backend service in production)
        } catch (e) {
          console.error('Newsletter signup failed:', e);
        }
      }
      
      await onComplete(profile);
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 mx-auto"
            >
              <img src={tokenLogo} alt="Raven" className="w-full h-full" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-white">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                The Raven Project
              </span>
            </h2>
            
            <p className="text-gray-400 max-w-md mx-auto">
              Let's set up your profile to unlock the full experience. This will only take a minute!
            </p>
            
            <div className="flex justify-center gap-4 pt-4">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                <Instagram className="w-6 h-6" />
              </a>
              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-black text-white border border-gray-700 hover:border-gray-500 transition-all"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
              <a
                href={SOCIAL_LINKS.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-blue-500 text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all"
              >
                <Twitter className="w-6 h-6" />
              </a>
            </div>
            
            <p className="text-sm text-gray-500">
              Follow us on social media to stay updated!
            </p>
          </motion.div>
        );
        
      case 'username':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Username</h2>
              <p className="text-gray-400">This is how others will find and recognize you</p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500">@</span>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="username"
                  maxLength={20}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-12 py-4 text-xl text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  {checkingUsername && (
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
              </div>
              
              {username.length > 0 && username.length < 3 && (
                <p className="text-yellow-400 text-sm">Username must be at least 3 characters</p>
              )}
              {usernameAvailable === false && (
                <p className="text-red-400 text-sm">This username is already taken</p>
              )}
              {usernameAvailable === true && (
                <p className="text-green-400 text-sm">✓ Username is available!</p>
              )}
              
              <p className="text-gray-500 text-xs">
                Only letters, numbers, and underscores. 3-20 characters.
              </p>
            </div>
          </motion.div>
        );
        
      case 'profile':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Customize Your Profile</h2>
              <p className="text-gray-400">Add a photo and tell us about yourself</p>
            </div>
            
            {/* Banner Upload */}
            <div className="relative">
              <div
                className={`h-32 rounded-xl overflow-hidden cursor-pointer group ${
                  bannerImage ? '' : 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 border-2 border-dashed border-gray-600'
                }`}
                onClick={() => bannerRef.current?.click()}
              >
                {bannerImage ? (
                  <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-gray-400 text-sm">Add Banner Image</span>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Upload className="w-8 h-8 text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={bannerRef}
                onChange={handleBannerUpload}
                accept="image/*"
                className="hidden"
              />
              
              {/* Profile Picture (overlapping banner) */}
              <div className="absolute -bottom-10 left-6">
                <div
                  className={`w-20 h-20 rounded-full overflow-hidden cursor-pointer border-4 border-gray-900 group ${
                    profilePicture ? '' : 'bg-gray-800'
                  }`}
                  onClick={() => profilePicRef.current?.click()}
                >
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <User className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <input
                  type="file"
                  ref={profilePicRef}
                  onChange={handleProfilePicUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
            
            <div className="pt-12 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Display Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={50}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Bio (optional)</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about yourself..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-500 text-right mt-1">{bio.length}/500</p>
              </div>
            </div>
          </motion.div>
        );
        
      case 'newsletter':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <Mail className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Join Our Mailing List!</h2>
              <p className="text-gray-400">Get exclusive updates, early access, and special offers</p>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-gray-700 cursor-pointer hover:border-amber-500/50 transition-colors">
                <input
                  type="checkbox"
                  checked={subscribeNewsletter}
                  onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-900"
                />
                <div>
                  <p className="text-white font-medium">Yes, I want to receive updates!</p>
                  <p className="text-gray-400 text-sm">We'll never spam you or share your info</p>
                </div>
              </label>
              
              {subscribeNewsletter && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-amber-400" />
                      <span className="text-amber-400 font-medium">Physical Mailing Address (Optional)</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">
                      Receive exclusive physical merchandise and surprises!
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={mailingAddress.street}
                          onChange={(e) => setMailingAddress({ ...mailingAddress, street: e.target.value })}
                          placeholder="Street Address"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={mailingAddress.city}
                          onChange={(e) => setMailingAddress({ ...mailingAddress, city: e.target.value })}
                          placeholder="City"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={mailingAddress.state}
                          onChange={(e) => setMailingAddress({ ...mailingAddress, state: e.target.value })}
                          placeholder="State"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={mailingAddress.zip}
                          onChange={(e) => setMailingAddress({ ...mailingAddress, zip: e.target.value })}
                          placeholder="ZIP Code"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={mailingAddress.country}
                          onChange={(e) => setMailingAddress({ ...mailingAddress, country: e.target.value })}
                          placeholder="Country"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        );
        
      case 'complete':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-white" />
            </motion.div>
            
            <h2 className="text-3xl font-bold text-white">You're All Set!</h2>
            
            <p className="text-gray-400 max-w-md mx-auto">
              Welcome to The Raven Project, <span className="text-amber-400 font-bold">@{username}</span>!
              Your profile has been created and saved on-chain.
            </p>
            
            {/* Profile Preview */}
            <div className="glass rounded-xl overflow-hidden max-w-sm mx-auto">
              {bannerImage ? (
                <div className="h-20 bg-cover bg-center" style={{ backgroundImage: `url(${bannerImage})` }} />
              ) : (
                <div className="h-20 bg-gradient-to-r from-amber-500/30 to-purple-500/30" />
              )}
              <div className="relative px-4 pb-4">
                <div className="absolute -top-8 left-4">
                  {profilePicture ? (
                    <img src={profilePicture} alt={displayName} className="w-16 h-16 rounded-full border-4 border-gray-900 object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-4 border-gray-900 bg-gray-800 flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="pt-10">
                  <h3 className="font-bold text-white">{displayName}</h3>
                  <p className="text-gray-400 text-sm">@{username}</p>
                  {bio && <p className="text-gray-300 text-sm mt-2">{bio}</p>}
                </div>
              </div>
            </div>
            
            {subscribeNewsletter && (
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Subscribed to newsletter
              </div>
            )}
          </motion.div>
        );
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-lg glass rounded-3xl overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 text-gray-400 hover:text-white z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Progress Bar */}
        <div className="h-1 bg-gray-800">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        
        {/* Step Indicators */}
        <div className="flex justify-center gap-2 pt-6 px-6">
          {STEPS.map((step, i) => (
            <div
              key={step.id}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                i === currentStep
                  ? 'bg-amber-500 text-black'
                  : i < currentStep
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              {i < currentStep ? (
                <Check className="w-3 h-3" />
              ) : (
                <step.icon className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">{step.title}</span>
            </div>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-6 min-h-[400px]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>
        
        {/* Navigation */}
        <div className="p-6 pt-0 flex justify-between">
          {currentStep > 0 && currentStep < STEPS.length - 1 ? (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}
          
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {currentStep === 0 ? "Let's Go" : 'Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isLoading}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Start Exploring
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}




