import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  BookOpen,
  Eye,
  Edit,
  Sparkles
} from 'lucide-react';

interface HALOResult {
  original_text: string;
  formatted_text: string;
  works_cited: string[];
  citations_added: number;
  plagiarism_check?: {
    is_plagiarized: boolean;
    plagiarism_percentage: number;
    detected_sources: Array<{
      url: string;
      matched_text: string;
      similarity_score: number;
    }>;
  };
  grammar_suggestions: Array<{
    text: string;
    suggestion: string;
    type: 'grammar' | 'style' | 'clarity';
  }>;
}

interface HALOResultsProps {
  result: HALOResult;
}

export const HALOResults: React.FC<HALOResultsProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<'original' | 'formatted' | 'citations' | 'plagiarism' | 'grammar'>('formatted');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const highlightText = (text: string, suggestions: typeof result.grammar_suggestions) => {
    let highlighted = text;
    suggestions.forEach((suggestion, index) => {
      const regex = new RegExp(suggestion.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      highlighted = highlighted.replace(regex, (match) => {
        const color = suggestion.type === 'grammar' ? 'yellow' : 
                     suggestion.type === 'style' ? 'blue' : 'green';
        return `<mark style="background-color: ${color}40; padding: 2px 4px; border-radius: 3px;" title="${suggestion.suggestion}">${match}</mark>`;
      });
    });
    return highlighted;
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
      {/* Stats Summary */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-gray-400 text-sm">Words</p>
              <p className="text-white font-bold text-xl">
                {result.formatted_text.split(/\s+/).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-gray-400 text-sm">Citations</p>
              <p className="text-white font-bold text-xl">
                {result.citations_added}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-gray-400 text-sm">Plagiarism</p>
              <p className="text-white font-bold text-xl">
                {result.plagiarism_check 
                  ? `${(100 - result.plagiarism_check.plagiarism_percentage).toFixed(0)}%`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-gray-400 text-sm">Suggestions</p>
              <p className="text-white font-bold text-xl">
                {result.grammar_suggestions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/20">
        {[
          { id: 'formatted', label: 'Formatted Document', icon: FileText },
          { id: 'original', label: 'Original', icon: Eye },
          { id: 'citations', label: 'Works Cited', icon: BookOpen },
          { id: 'plagiarism', label: 'Plagiarism Check', icon: AlertCircle },
          { id: 'grammar', label: 'Grammar & Style', icon: Edit },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 flex items-center gap-2 font-semibold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-purple-400 border-purple-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'formatted' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-xl p-6 border border-white/10"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Formatted Document</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(result.formatted_text)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => handleDownload(result.formatted_text, 'formatted-document.txt')}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
            <div 
              className="prose prose-invert max-w-none text-white whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ 
                __html: highlightText(result.formatted_text, result.grammar_suggestions) 
              }}
            />
          </motion.div>
        )}

        {activeTab === 'original' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">Original Document</h3>
            <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
              {result.original_text}
            </div>
          </motion.div>
        )}

        {activeTab === 'citations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-xl p-6 border border-white/10"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Works Cited</h3>
              <button
                onClick={() => handleCopy(result.works_cited.join('\n\n'))}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy All'}
              </button>
            </div>
            <div className="space-y-4">
              {result.works_cited.length > 0 ? (
                result.works_cited.map((citation, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <p className="text-white font-mono text-sm leading-relaxed">
                      {citation}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">
                  No citations generated. Enable "Generate works cited" option to create citations.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'plagiarism' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">Plagiarism Check Results</h3>
            {result.plagiarism_check ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                    result.plagiarism_check.plagiarism_percentage < 15
                      ? 'bg-green-500/20 border-4 border-green-500'
                      : result.plagiarism_check.plagiarism_percentage < 30
                      ? 'bg-yellow-500/20 border-4 border-yellow-500'
                      : 'bg-red-500/20 border-4 border-red-500'
                  }`}>
                    <span className="text-2xl font-bold text-white">
                      {result.plagiarism_check.plagiarism_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {result.plagiarism_check.is_plagiarized 
                        ? 'Plagiarism Detected' 
                        : 'Original Content'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {result.plagiarism_check.detected_sources.length} source(s) found
                    </p>
                  </div>
                </div>

                {result.plagiarism_check.detected_sources.length > 0 && (
                  <div className="space-y-3 mt-6">
                    <h4 className="text-white font-semibold">Detected Sources:</h4>
                    {result.plagiarism_check.detected_sources.map((source, index) => (
                      <div
                        key={index}
                        className="bg-white/5 rounded-lg p-4 border border-white/10"
                      >
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 text-sm font-semibold mb-2 block"
                        >
                          {source.url}
                        </a>
                        <p className="text-gray-300 text-sm mb-2">
                          Similarity: {(source.similarity_score * 100).toFixed(1)}%
                        </p>
                        <p className="text-gray-400 text-xs italic">
                          "{source.matched_text.substring(0, 150)}..."
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                Plagiarism check not performed. Enable "Check for plagiarism" option.
              </p>
            )}
          </motion.div>
        )}

        {activeTab === 'grammar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">Grammar & Style Suggestions</h3>
            {result.grammar_suggestions.length > 0 ? (
              <div className="space-y-3">
                {result.grammar_suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        suggestion.type === 'grammar' ? 'bg-yellow-400' :
                        suggestion.type === 'style' ? 'bg-blue-400' :
                        'bg-green-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-white font-semibold mb-1">
                          {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} Issue
                        </p>
                        <p className="text-gray-300 text-sm mb-2 italic">
                          "{suggestion.text}"
                        </p>
                        <p className="text-purple-300 text-sm">
                          <strong>Suggestion:</strong> {suggestion.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                No grammar or style issues found. Great work!
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

