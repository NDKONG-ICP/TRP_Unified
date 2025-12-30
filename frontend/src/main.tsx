import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityKitProvider } from "@nfid/identitykit/react";
import { IdentityKitAuthType } from "@nfid/identitykit";
import App from './App';
import './index.css';
import './styles/newspaper.css';
import './i18n'; // Initialize i18n
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { initializeAccessibility } from './stores/accessibilityStore';

// Initialize accessibility settings on load
initializeAccessibility();

// Suppress known browser extension errors that don't affect functionality
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Suppress Solana wallet extension errors
    if (message.includes('solanaActionsContentScript') || message.includes('Invalid asm.js')) {
      return;
    }
    // Suppress IC Dashboard log fetch errors
    if (message.includes('fetch_canister_logs') || message.includes('not allowed to access canister logs')) {
      return;
    }
        // Suppress Internet Identity 404s
        if (message.includes('ii-alternative-origins') || message.includes('.well-known')) {
          return;
        }
        // Suppress Plug wallet localhost connection attempts on mainnet
        if (message.includes('localhost:5000') || message.includes('127.0.0.1:5000')) {
          return;
        }
        // Suppress Plug wallet CORS errors for localhost (harmless on mainnet)
        if (message.includes('CORS policy') && message.includes('localhost')) {
          return;
        }
        // Suppress Plug wallet fetch errors for localhost
        if (message.includes('Failed to fetch') && message.includes('localhost')) {
          return;
        }
        originalError.apply(console, args);
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

const identityKitConfig = {
  signerClientOptions: {
    targets: [
      '3noas-jyaaa-aaaao-a4xda-cai', // raven_ai
      'k6lqw-bqaaa-aaaao-a4yhq-cai', // queen_bee
      '3rk2d-6yaaa-aaaao-a4xba-cai', // treasury
      '3yjr7-iqaaa-aaaao-a4xaq-cai', // kip
      'vmcfj-haaaa-aaaao-a4o3q-cai', // icspicy
    ],
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <IdentityKitProvider
          signerClientOptions={identityKitConfig.signerClientOptions}
          authType={IdentityKitAuthType.DELEGATION}
        >
          <App />
        </IdentityKitProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

