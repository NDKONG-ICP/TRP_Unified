import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { newsService } from '../../services/newsService';

interface HaloAssistantProps {
  content: string;
  onSuggestionApply?: (suggestion: string) => void;
}

export const HaloAssistant: React.FC<HaloAssistantProps> = ({ content, onSuggestionApply }) => {
  const { identity, isAuthenticated } = useAuthStore();
  const [suggestions, setSuggestions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writingStyle, setWritingStyle] = useState<'academic' | 'journalistic' | 'creative'>('academic');

  // Initialize newsService with identity
  useEffect(() => {
    if (identity) {
      newsService.init(identity).catch(err => {
        console.error('Failed to initialize newsService:', err);
      });
    }
  }, [identity]);

  const getSuggestions = async () => {
    if (!isAuthenticated || !identity) {
      setError('Please connect your wallet to use HALO assistant');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await newsService.init(identity);
      const result = await newsService.getHaloSuggestions(content, writingStyle);
      setSuggestions(result);
    } catch (error: any) {
      console.error('Failed to get HALO suggestions:', error);
      setError(error.message || 'Failed to get suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="halo-assistant-container p-6 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl border border-purple-500/30">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {!isAuthenticated && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">Connect your wallet to use HALO assistant</p>
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">HALO Academic Writing Assistant</h3>
          <p className="text-sm text-gray-400">AI-powered writing suggestions</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-300">Writing Style</label>
        <select
          value={writingStyle}
          onChange={(e) => setWritingStyle(e.target.value as any)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="academic">Academic</option>
          <option value="journalistic">Journalistic</option>
          <option value="creative">Creative</option>
        </select>
      </div>

      <button
        onClick={getSuggestions}
        disabled={loading || !content.trim()}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Get Writing Suggestions
          </>
        )}
      </button>

      {suggestions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{suggestions.grammar_score}%</div>
              <div className="text-sm text-gray-400">Grammar</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{suggestions.clarity_score}%</div>
              <div className="text-sm text-gray-400">Clarity</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{suggestions.academic_score}%</div>
              <div className="text-sm text-gray-400">Academic</div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-bold mb-2 text-white">Suggestions</h4>
            <p className="text-gray-300 whitespace-pre-wrap">{suggestions.suggestions}</p>
          </div>

          {suggestions.recommendations && suggestions.recommendations.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-bold mb-2 text-white">Recommendations</h4>
              <ul className="space-y-2">
                {suggestions.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

