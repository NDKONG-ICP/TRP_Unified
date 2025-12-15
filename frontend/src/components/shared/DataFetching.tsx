/**
 * Data Fetching Components
 * Provides consistent loading states, error handling, and empty states
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw, ServerCrash, WifiOff, Database, FileQuestion } from 'lucide-react';

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', message, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-gold-400 animate-spin`} />
      {message && <p className="text-silver-400 text-sm animate-pulse">{message}</p>}
    </div>
  );
}

// Loading Card - for card-based layouts
interface LoadingCardProps {
  count?: number;
  className?: string;
}

export function LoadingCard({ count = 1, className = '' }: LoadingCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className={`animate-pulse bg-gray-800/50 rounded-xl border border-gold-600/20 overflow-hidden ${className}`}
        >
          <div className="aspect-square bg-gray-700/50" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-700/50 rounded w-3/4" />
            <div className="h-3 bg-gray-700/50 rounded w-1/2" />
            <div className="h-3 bg-gray-700/50 rounded w-2/3" />
          </div>
        </div>
      ))}
    </>
  );
}

// Loading Table Row - for table layouts
export function LoadingTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-700/50 rounded w-20" />
        </td>
      ))}
    </tr>
  );
}

// Full Page Loading
interface FullPageLoadingProps {
  message?: string;
}

export function FullPageLoading({ message = 'Loading...' }: FullPageLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-raven-black/90 backdrop-blur-sm"
    >
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-4"
        >
          <Database className="w-16 h-16 text-gold-400" />
        </motion.div>
        <p className="text-gold-100 text-lg font-medium">{message}</p>
        <p className="text-silver-500 text-sm mt-2">Fetching from Internet Computer...</p>
      </div>
    </motion.div>
  );
}

// Error Display Component
interface ErrorDisplayProps {
  error: string | Error | null;
  title?: string;
  onRetry?: () => void;
  className?: string;
  variant?: 'inline' | 'card' | 'fullpage';
}

export function ErrorDisplay({ 
  error, 
  title = 'Error Loading Data', 
  onRetry, 
  className = '',
  variant = 'card'
}: ErrorDisplayProps) {
  const errorMessage = error instanceof Error ? error.message : error || 'An unexpected error occurred';
  
  // Determine error type for appropriate icon
  const isNetworkError = errorMessage?.toLowerCase().includes('network') || 
                         errorMessage?.toLowerCase().includes('fetch') ||
                         errorMessage?.toLowerCase().includes('connection');
  const isServerError = errorMessage?.toLowerCase().includes('500') || 
                        errorMessage?.toLowerCase().includes('server');
  
  const ErrorIcon = isNetworkError ? WifiOff : isServerError ? ServerCrash : AlertCircle;

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-red-400 ${className}`}>
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">{errorMessage}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-2 text-gold-400 hover:text-gold-300">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'fullpage') {
    return (
      <div className={`min-h-[60vh] flex items-center justify-center ${className}`}>
        <div className="text-center max-w-md mx-auto p-8">
          <ErrorIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gold-100 mb-2">{title}</h2>
          <p className="text-silver-400 mb-6">{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn-gold inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-red-500/10 border border-red-500/30 rounded-xl p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <ErrorIcon className="w-8 h-8 text-red-400 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-300 mb-1">{title}</h3>
          <p className="text-red-200/70 text-sm mb-4">{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Empty State Component
interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  title = 'No Data Found',
  message = 'There is no data to display at this time.',
  icon,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-center py-12 ${className}`}
    >
      <div className="w-16 h-16 mx-auto mb-4 text-silver-600">
        {icon || <FileQuestion className="w-16 h-16" />}
      </div>
      <h3 className="text-lg font-semibold text-gold-100 mb-2">{title}</h3>
      <p className="text-silver-400 text-sm mb-6 max-w-sm mx-auto">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-gold"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

// Data Wrapper - Combines loading, error, and empty states
interface DataWrapperProps<T> {
  data: T | null | undefined;
  isLoading: boolean;
  error: string | Error | null;
  onRetry?: () => void;
  loadingMessage?: string;
  emptyState?: {
    title?: string;
    message?: string;
    icon?: React.ReactNode;
    action?: { label: string; onClick: () => void };
  };
  children: (data: T) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  className?: string;
}

export function DataWrapper<T>({
  data,
  isLoading,
  error,
  onRetry,
  loadingMessage = 'Loading...',
  emptyState,
  children,
  loadingComponent,
  className = '',
}: DataWrapperProps<T>) {
  if (isLoading) {
    return (
      <div className={className}>
        {loadingComponent || <LoadingSpinner message={loadingMessage} className="py-12" />}
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorDisplay error={error} onRetry={onRetry} />
      </div>
    );
  }

  const isEmpty = data === null || 
                  data === undefined || 
                  (Array.isArray(data) && data.length === 0) ||
                  (typeof data === 'object' && Object.keys(data as object).length === 0);

  if (isEmpty) {
    return (
      <div className={className}>
        <EmptyState {...emptyState} />
      </div>
    );
  }

  return <>{children(data as T)}</>;
}

// Skeleton Components for specific use cases
export function StatSkeleton() {
  return (
    <div className="animate-pulse bg-gray-800/50 rounded-xl p-4 border border-gold-600/20">
      <div className="h-3 bg-gray-700/50 rounded w-1/2 mb-2" />
      <div className="h-6 bg-gray-700/50 rounded w-3/4" />
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-4 p-4 border-b border-gray-800/50">
      <div className="w-10 h-10 bg-gray-700/50 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-700/50 rounded w-1/3" />
        <div className="h-3 bg-gray-700/50 rounded w-1/4" />
      </div>
      <div className="h-5 bg-gray-700/50 rounded w-20" />
    </div>
  );
}

export function NFTCardSkeleton() {
  return (
    <div className="animate-pulse bg-gray-800/50 rounded-xl overflow-hidden border border-gold-600/20">
      <div className="aspect-square bg-gray-700/50" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-700/50 rounded w-3/4" />
        <div className="flex justify-between">
          <div className="h-3 bg-gray-700/50 rounded w-1/3" />
          <div className="h-3 bg-gray-700/50 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

export function LeaderboardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4 p-3 bg-gray-800/30 rounded-lg">
          <div className="w-8 h-8 bg-gray-700/50 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-700/50 rounded w-1/3 mb-1" />
            <div className="h-3 bg-gray-700/50 rounded w-1/4" />
          </div>
          <div className="h-5 bg-gray-700/50 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// Hook for managing async data
import { useState, useCallback, useEffect, useRef } from 'react';

interface UseAsyncDataOptions<T> {
  fetchFn: () => Promise<T>;
  immediate?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: T) => void;
}

export function useAsyncData<T>({ 
  fetchFn, 
  immediate = true,
  onError,
  onSuccess 
}: UseAsyncDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        onSuccess?.(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMsg);
        onError?.(err instanceof Error ? err : new Error(errorMsg));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFn, onError, onSuccess]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) {
      fetch();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetch, immediate]);

  return {
    data,
    isLoading,
    error,
    refetch: fetch,
    setData,
  };
}

export default DataWrapper;




