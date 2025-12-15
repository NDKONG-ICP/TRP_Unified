// ICPay Integration Component
// Seamless payment processing for the Raven ecosystem

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

interface PaymentMethod {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  enabled: boolean;
}

interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  recipient?: string;
  metadata?: Record<string, string>;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  timestamp: number;
}

const SUPPORTED_CURRENCIES: PaymentMethod[] = [
  { id: 'icp', name: 'Internet Computer', symbol: 'ICP', icon: '🌐', enabled: true },
  { id: 'ckbtc', name: 'Chain-Key Bitcoin', symbol: 'ckBTC', icon: '₿', enabled: true },
  { id: 'cketh', name: 'Chain-Key Ethereum', symbol: 'ckETH', icon: 'Ξ', enabled: true },
  { id: 'ckusdc', name: 'Chain-Key USDC', symbol: 'ckUSDC', icon: '💵', enabled: true },
  { id: 'cksol', name: 'Chain-Key Solana', symbol: 'ckSOL', icon: '◎', enabled: true },
];

interface ICPayProps {
  amount?: number;
  currency?: string;
  description?: string;
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: string) => void;
  mode?: 'button' | 'form' | 'inline';
}

export const ICPayIntegration: React.FC<ICPayProps> = ({
  amount: initialAmount,
  currency: initialCurrency = 'icp',
  description = '',
  onSuccess,
  onError,
  mode = 'form',
}) => {
  const { t } = useTranslation();
  const { isAuthenticated, principal } = useAuthStore();
  
  const [amount, setAmount] = useState(initialAmount || 0);
  const [currency, setCurrency] = useState(initialCurrency);
  const [recipient, setRecipient] = useState('');
  const [memo, setMemo] = useState(description);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Get current exchange rates (simulated)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    icp: 12.50,
    ckbtc: 97500,
    cketh: 3200,
    ckusdc: 1.00,
    cksol: 185,
  });

  useEffect(() => {
    // In production, fetch real exchange rates
    const fetchRates = async () => {
      try {
        // Simulated rate fetch
        // const response = await fetch('https://api.coingecko.com/...');
        // setExchangeRates(response.data);
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      }
    };
    
    fetchRates();
    const interval = setInterval(fetchRates, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  const getUSDValue = () => {
    return (amount * (exchangeRates[currency] || 1)).toFixed(2);
  };

  const handlePayment = async () => {
    if (!isAuthenticated) {
      onError?.('Please connect your wallet first');
      return;
    }

    if (amount <= 0) {
      onError?.('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    setShowConfirm(false);

    try {
      // In production, this would interact with the ICP Ledger canister
      // and/or the ICPay service
      
      // Simulated payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result: PaymentResult = {
        success: true,
        transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      setLastResult(result);
      onSuccess?.(result);
    } catch (error: any) {
      const errorMessage = error.message || 'Payment failed';
      setLastResult({
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
      });
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (mode === 'button') {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isProcessing || !isAuthenticated}
        className="btn-primary flex items-center gap-2"
      >
        {isProcessing ? (
          <>
            <span className="animate-spin">⏳</span>
            {t('payments.processing')}
          </>
        ) : (
          <>
            <span>💳</span>
            {t('payments.pay')} {amount} {currency.toUpperCase()}
          </>
        )}
      </button>
    );
  }

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl">
          💳
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{t('payments.icpay')}</h3>
          <p className="text-sm text-gray-400">{t('payments.securePayments')}</p>
        </div>
      </div>

      {/* Currency Selection */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">{t('payments.selectCurrency')}</label>
        <div className="grid grid-cols-5 gap-2">
          {SUPPORTED_CURRENCIES.map((curr) => (
            <button
              key={curr.id}
              onClick={() => setCurrency(curr.id)}
              disabled={!curr.enabled}
              className={`p-3 rounded-lg border transition-all ${
                currency === curr.id
                  ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                  : 'border-gray-700 hover:border-gray-600 text-gray-400'
              } ${!curr.enabled && 'opacity-50 cursor-not-allowed'}`}
            >
              <div className="text-xl mb-1">{curr.icon}</div>
              <div className="text-xs font-medium">{curr.symbol}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">{t('payments.amount')}</label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="input-primary w-full text-2xl font-bold pr-20"
            step="0.01"
            min="0"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {currency.toUpperCase()}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          ≈ ${getUSDValue()} USD
        </div>
      </div>

      {/* Recipient (optional) */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">{t('payments.recipient')}</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder={t('payments.recipientPlaceholder')}
          className="input-primary w-full"
        />
      </div>

      {/* Memo */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">{t('payments.memo')}</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder={t('payments.memoPlaceholder')}
          className="input-primary w-full"
        />
      </div>

      {/* Exchange Rate Info */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{t('payments.exchangeRate')}</span>
          <span className="text-white">
            1 {currency.toUpperCase()} = ${exchangeRates[currency]?.toFixed(2) || '0.00'} USD
          </span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-400">{t('payments.networkFee')}</span>
          <span className="text-white">~0.0001 {currency.toUpperCase()}</span>
        </div>
      </div>

      {/* Payment Button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isProcessing || !isAuthenticated || amount <= 0}
        className="btn-primary w-full py-4 text-lg font-bold"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            {t('payments.processing')}
          </span>
        ) : !isAuthenticated ? (
          t('payments.connectWallet')
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>🚀</span>
            {t('payments.sendPayment')}
          </span>
        )}
      </button>

      {/* Last Transaction Result */}
      {lastResult && (
        <div className={`p-4 rounded-lg ${
          lastResult.success 
            ? 'bg-green-500/20 border border-green-500/50' 
            : 'bg-red-500/20 border border-red-500/50'
        }`}>
          {lastResult.success ? (
            <div className="text-green-400">
              <div className="font-bold mb-1">✓ {t('payments.success')}</div>
              <div className="text-sm">
                {t('payments.transactionId')}: {lastResult.transactionId}
              </div>
            </div>
          ) : (
            <div className="text-red-400">
              <div className="font-bold mb-1">✗ {t('payments.failed')}</div>
              <div className="text-sm">{lastResult.error}</div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              {t('payments.confirmPayment')}
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-400">{t('payments.amount')}</span>
                <span className="text-white font-bold">
                  {amount} {currency.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{t('payments.usdValue')}</span>
                <span className="text-white">${getUSDValue()}</span>
              </div>
              {recipient && (
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('payments.to')}</span>
                  <span className="text-white text-sm truncate max-w-[150px] sm:max-w-[200px]">
                    {recipient}
                  </span>
                </div>
              )}
              {memo && (
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('payments.memo')}</span>
                  <span className="text-white text-sm">{memo}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 btn-primary py-3"
              >
                {t('payments.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ICPayIntegration;




