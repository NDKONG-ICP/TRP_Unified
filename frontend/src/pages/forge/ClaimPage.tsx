import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, Wallet, Check, AlertCircle, Loader2, Camera, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ICSpicyMintService } from '../../services/icSpicyMintService';
import { Principal } from '@dfinity/principal';

// Declare global for QR scanner
declare global {
  interface Window {
    qrScanner: any;
  }
}

export default function ClaimPage() {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, login, principal } = useAuthStore();
  const [claimCode, setClaimCode] = useState(tokenId || '');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ success: boolean; message: string; nft?: any } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  // Initialize QR scanner when shown
  useEffect(() => {
    if (showScanner && qrReaderRef.current) {
      // Use browser's native QR code scanning via getUserMedia
      const initQRScanner = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } // Use back camera on mobile
          });
          
          const video = document.createElement('video');
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          video.style.width = '100%';
          video.style.height = 'auto';
          video.style.borderRadius = '0.5rem';
          
          if (qrReaderRef.current) {
            qrReaderRef.current.innerHTML = '';
            qrReaderRef.current.appendChild(video);
            video.play();
            
            // Use BarcodeDetector API if available (Chrome/Edge)
            if ('BarcodeDetector' in window) {
              const barcodeDetector = new (window as any).BarcodeDetector({
                formats: ['qr_code']
              });
              
              const detectQR = async () => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                  try {
                    const barcodes = await barcodeDetector.detect(video);
                    if (barcodes.length > 0) {
                      const qrValue = barcodes[0].rawValue;
                      setClaimCode(qrValue);
                      setShowScanner(false);
                      stream.getTracks().forEach(track => track.stop());
                      // Auto-submit if valid
                      setTimeout(() => {
                        handleClaim();
                      }, 500);
                    }
                  } catch (err) {
                    // Continue scanning
                  }
                }
                if (showScanner) {
                  requestAnimationFrame(detectQR);
                }
              };
              
              video.addEventListener('loadedmetadata', () => {
                detectQR();
              });
            } else {
              // Fallback: Show video and let user manually enter code
              const fallbackText = document.createElement('p');
              fallbackText.className = 'text-silver-500 text-sm mt-2';
              fallbackText.textContent = 'QR scanning not supported. Please enter code manually.';
              qrReaderRef.current.appendChild(fallbackText);
            }
          }
        } catch (err) {
          console.error('Failed to access camera:', err);
          if (qrReaderRef.current) {
            qrReaderRef.current.innerHTML = `
              <div class="text-center py-8">
                <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-2" />
                <p class="text-red-400 mb-2">Camera access denied</p>
                <p class="text-silver-500 text-sm">Please allow camera access or enter code manually</p>
              </div>
            `;
          }
        }
      };
      
      initQRScanner();
      
      return () => {
        // Cleanup
        if (window.qrScanner) {
          window.qrScanner.stop?.();
          window.qrScanner = null;
        }
      };
    }
  }, [showScanner]);

  const handleClaim = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }

    if (!claimCode.trim()) {
      setClaimResult({ success: false, message: 'Please enter a claim code' });
      return;
    }

    if (!principal) {
      setClaimResult({ success: false, message: 'Principal not available. Please reconnect your wallet.' });
      return;
    }

    setIsClaiming(true);
    setClaimResult(null);

    try {
      // Validate claim code format (could be token ID or special claim code)
      // For now, if it's a number, treat it as a token ID to check ownership
      // Otherwise, use it as a claim code for minting
      const codeAsNumber = parseInt(claimCode.trim());
      
      if (!isNaN(codeAsNumber)) {
        // If it's a number, check if user already owns it
        const userTokens = await ICSpicyMintService.getUserTokens(Principal.fromText(principal.toString()));
        if (userTokens.includes(BigInt(codeAsNumber))) {
          setClaimResult({
            success: true,
            message: 'You already own this NFT!',
            nft: {
              id: codeAsNumber.toString(),
              name: `IC Spicy #${codeAsNumber}`,
              rarity: 'rare',
            },
          });
          setIsClaiming(false);
          return;
        }
      }

      // Mint new NFT to user (claim code validation would be added in backend)
      // For now, we'll mint a new NFT when a claim code is provided
      const recipient = Principal.fromText(principal.toString());
      const result = await ICSpicyMintService.mint(recipient);
      
      if (result.success && result.token_ids.length > 0) {
        const tokenId = result.token_ids[0];
        
        // Fetch metadata for the minted NFT
        const metadata = await ICSpicyMintService.getNFTMetadata(tokenId);
        
        // Use metadata rarity if available, otherwise fallback
        let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
        if (metadata?.rarity) {
          rarity = metadata.rarity;
        } else {
          const rarityIndex = Number(tokenId) % 4;
          const rarities = ['common', 'rare', 'epic', 'legendary'] as const;
          rarity = rarities[rarityIndex];
        }
        
        setClaimResult({
          success: true,
          message: 'NFT claimed successfully!',
          nft: {
            id: tokenId.toString(),
            name: `IC Spicy #${tokenId}`,
            rarity,
            tokenId: tokenId.toString(),
          },
        });
      } else {
        throw new Error('Minting failed - no tokens were minted');
      }
    } catch (error) {
      console.error('Claim error:', error);
      setClaimResult({
        success: false,
        message: error instanceof Error ? error.message : 'Claim failed. Please check your claim code and try again.',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-spicy-red/20 to-spicy-orange/20 flex items-center justify-center">
          <QrCode className="w-10 h-10 text-spicy-orange" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4">
          <span className="text-white">Claim Your</span>{' '}
          <span className="text-spicy-orange">NFT</span>
        </h1>
        <p className="text-silver-400 max-w-md mx-auto">
          Enter your claim code or scan the QR code from your purchase to claim your NFT
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-3xl p-8 border border-spicy-orange/20"
      >
        {/* Claim Code Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-silver-400 mb-2">
            Claim Code
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter your claim code..."
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              className="input flex-1"
            />
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="px-4 rounded-xl bg-raven-dark border border-raven-gray hover:border-spicy-orange text-silver-400 hover:text-spicy-orange transition-all"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* QR Scanner Placeholder */}
        {showScanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6"
          >
            <div className="glass rounded-xl p-4">
              <div className="text-center mb-4">
                <h3 className="text-white font-bold mb-2">Scan QR Code</h3>
                <p className="text-silver-500 text-sm">Point your camera at the QR code</p>
              </div>
              <div ref={qrReaderRef} className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black min-h-[300px] flex items-center justify-center aspect-square">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-silver-600 mx-auto mb-3" />
                  <p className="text-silver-500 text-sm">Initializing camera...</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowScanner(false);
                  if (window.qrScanner) {
                    window.qrScanner.stop?.();
                    window.qrScanner = null;
                  }
                }}
                className="mt-4 w-full px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Close Scanner
              </button>
            </div>
          </motion.div>
        )}

        {/* Auth Status */}
        {!isAuthenticated && (
          <div className="mb-6 p-4 rounded-xl bg-gold-500/10 border border-gold-500/30">
            <p className="text-gold-400 text-sm flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              Connect your wallet to claim your NFT
            </p>
          </div>
        )}

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={isClaiming || !claimCode.trim()}
          className="w-full py-4 bg-gradient-to-r from-spicy-red to-spicy-orange hover:from-spicy-orange hover:to-spicy-flame text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isClaiming ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Claiming...
            </>
          ) : !isAuthenticated ? (
            <>
              <Wallet className="w-5 h-5 mr-2" />
              Connect & Claim
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Claim NFT
            </>
          )}
        </button>

        {/* Result */}
        {claimResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 rounded-xl p-6 ${
              claimResult.success
                ? 'bg-green-500/10 border border-green-500/30'
                : 'bg-red-500/10 border border-red-500/30'
            }`}
          >
            <div className="flex items-start">
              {claimResult.success ? (
                <Check className="w-6 h-6 text-green-500 mr-4 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-500 mr-4 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${claimResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {claimResult.message}
                </p>
                {claimResult.nft && (
                  <div className="mt-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-spicy-red/20 to-spicy-orange/20 flex items-center justify-center">
                        <span className="text-3xl">🌶️</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white">{claimResult.nft.name}</p>
                        <p className="text-sm text-spicy-orange capitalize">{claimResult.nft.rarity}</p>
                        {claimResult.nft.tokenId && (
                          <p className="text-xs text-silver-500 mt-1">Token ID: {claimResult.nft.tokenId}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate('/forge/wallet')}
                        className="flex-1 px-4 py-2 bg-spicy-orange/20 hover:bg-spicy-orange/30 text-spicy-orange rounded-lg transition-colors text-sm font-medium"
                      >
                        View in Wallet
                      </button>
                      <button
                        onClick={() => navigate('/forge/collection')}
                        className="flex-1 px-4 py-2 bg-raven-dark hover:bg-raven-gray text-silver-400 hover:text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        View Collection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 text-center"
      >
        <h3 className="text-lg font-bold text-white mb-4">How to Claim</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4 border border-spicy-orange/10">
            <div className="w-10 h-10 rounded-full bg-spicy-orange/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-spicy-orange font-bold">1</span>
            </div>
            <p className="text-sm text-silver-400">Find your claim code on your purchase receipt or QR code</p>
          </div>
          <div className="glass rounded-xl p-4 border border-spicy-orange/10">
            <div className="w-10 h-10 rounded-full bg-spicy-orange/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-spicy-orange font-bold">2</span>
            </div>
            <p className="text-sm text-silver-400">Connect your wallet with Internet Identity</p>
          </div>
          <div className="glass rounded-xl p-4 border border-spicy-orange/10">
            <div className="w-10 h-10 rounded-full bg-spicy-orange/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-spicy-orange font-bold">3</span>
            </div>
            <p className="text-sm text-silver-400">Enter the code and click Claim to receive your NFT</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}




