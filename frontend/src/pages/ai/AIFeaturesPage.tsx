// AI Features Page - LLM Council Interface and AI Memory System
// Based on https://github.com/karpathy/llm-council

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

interface LLMProvider {
  id: string;
  name: string;
  model: string;
  icon: string;
  color: string;
}

interface CouncilResponse {
  providerId: string;
  providerName: string;
  response: string;
  tokensUsed: number;
  latencyMs: number;
  rank?: number;
}

interface CouncilResult {
  sessionId: string;
  query: string;
  finalResponse: string;
  individualResponses: CouncilResponse[];
  rankings: Record<string, number>;
  confidenceScore: number;
  processingTimeMs: number;
}

interface Memory {
  id: string;
  content: string;
  memoryType: string;
  importance: number;
  tags: string[];
  createdAt: number;
}

const LLM_PROVIDERS: LLMProvider[] = [
  { id: 'gpt4', name: 'GPT-4', model: 'gpt-4-turbo', icon: '🤖', color: 'from-green-400 to-green-600' },
  { id: 'claude', name: 'Claude', model: 'claude-3-opus', icon: '🧠', color: 'from-purple-400 to-purple-600' },
  { id: 'gemini', name: 'Gemini', model: 'gemini-pro', icon: '✨', color: 'from-blue-400 to-blue-600' },
  { id: 'llama', name: 'Llama', model: 'llama-3-70b', icon: '🦙', color: 'from-orange-400 to-orange-600' },
  { id: 'mistral', name: 'Mistral', model: 'mistral-large', icon: '🌪️', color: 'from-cyan-400 to-cyan-600' },
];

export const AIFeaturesPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, principal } = useAuthStore();
  
  // LLM Council State
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [councilResult, setCouncilResult] = useState<CouncilResult | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['gpt4', 'claude', 'gemini']);
  const [showResponses, setShowResponses] = useState(false);
  
  // Memory State
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [memoryType, setMemoryType] = useState('short_term');
  const [memoryTags, setMemoryTags] = useState('');
  
  // Knowledge Graph State
  const [knowledgeNodes, setKnowledgeNodes] = useState<any[]>([]);
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const toggleProvider = (id: string) => {
    if (selectedProviders.includes(id)) {
      if (selectedProviders.length > 1) {
        setSelectedProviders(prev => prev.filter(p => p !== id));
      }
    } else {
      setSelectedProviders(prev => [...prev, id]);
    }
  };

  const handleCouncilQuery = async () => {
    if (!query.trim() || !isAuthenticated) return;

    setIsProcessing(true);
    setCouncilResult(null);

    try {
      // Simulate LLM Council processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate simulated responses from each provider
      const responses: CouncilResponse[] = selectedProviders.map((providerId, index) => {
        const provider = LLM_PROVIDERS.find(p => p.id === providerId)!;
        return {
          providerId,
          providerName: provider.name,
          response: generateSimulatedResponse(query, provider.name),
          tokensUsed: 150 + Math.floor(Math.random() * 200),
          latencyMs: 500 + Math.floor(Math.random() * 1500),
          rank: index + 1,
        };
      });

      // Simulate chairman synthesis
      await new Promise(resolve => setTimeout(resolve, 500));

      const result: CouncilResult = {
        sessionId: `session-${Date.now()}`,
        query,
        finalResponse: synthesizeResponses(responses, query),
        individualResponses: responses,
        rankings: Object.fromEntries(responses.map((r, i) => [r.providerId, i + 1])),
        confidenceScore: 0.85 + Math.random() * 0.1,
        processingTimeMs: responses.reduce((acc, r) => acc + r.latencyMs, 0) + 500,
      };

      setCouncilResult(result);
      setQuery('');
    } catch (error) {
      console.error('Council query failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSimulatedResponse = (query: string, providerName: string): string => {
    const responses: Record<string, string[]> = {
      'GPT-4': [
        `Based on my analysis of "${query}", I would suggest considering multiple perspectives...`,
        `This is an interesting question. From a technical standpoint...`,
        `Let me break this down systematically...`,
      ],
      'Claude': [
        `I appreciate the thoughtfulness of this question. Regarding "${query}"...`,
        `This requires careful consideration. My analysis suggests...`,
        `From an ethical and practical standpoint...`,
      ],
      'Gemini': [
        `Analyzing the query "${query}" from multiple angles...`,
        `Here's a comprehensive view based on available data...`,
        `Integrating various sources of information...`,
      ],
      'Llama': [
        `Processing your request about "${query}"...`,
        `Based on my training, I can offer the following insights...`,
        `Here's what I've gathered from my knowledge base...`,
      ],
      'Mistral': [
        `Regarding "${query}", here's my perspective...`,
        `Let me provide a detailed analysis...`,
        `Based on the context provided...`,
      ],
    };

    const providerResponses = responses[providerName] || responses['GPT-4'];
    return providerResponses[Math.floor(Math.random() * providerResponses.length)];
  };

  const synthesizeResponses = (responses: CouncilResponse[], query: string): string => {
    return `**Council Consensus on "${query}"**\n\n` +
      `After analyzing responses from ${responses.length} AI models, the council has reached the following consensus:\n\n` +
      `The query touches on several important aspects that each model approached differently. ` +
      `${responses[0]?.providerName || 'The first model'} provided strong analytical insights, ` +
      `while ${responses[1]?.providerName || 'another model'} offered a more nuanced perspective.\n\n` +
      `**Key Points of Agreement:**\n` +
      `- The importance of considering multiple viewpoints\n` +
      `- The need for careful analysis before conclusions\n` +
      `- Recognition of the complexity inherent in the question\n\n` +
      `**Confidence Level:** High (${(0.85 + Math.random() * 0.1).toFixed(2)})\n\n` +
      `This synthesis represents the collective wisdom of the AI council.`;
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim() || !isAuthenticated) return;

    const memory: Memory = {
      id: `mem-${Date.now()}`,
      content: newMemory,
      memoryType,
      importance: memoryType === 'long_term' ? 0.8 : 0.5,
      tags: memoryTags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: Date.now(),
    };

    setMemories(prev => [memory, ...prev]);
    setNewMemory('');
    setMemoryTags('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gold-gradient-text">🧠 Raven AI Council</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t('ai.description', 'Multi-LLM consensus system with persistent memory and knowledge graph integration')}
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LLM Council Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Provider Selection */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>🤖</span> {t('ai.selectModels', 'Select AI Models')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {LLM_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => toggleProvider(provider.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedProviders.includes(provider.id)
                        ? `border-amber-500 bg-gradient-to-br ${provider.color} bg-opacity-20`
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">{provider.icon}</div>
                    <div className="text-sm font-medium text-white">{provider.name}</div>
                    <div className="text-xs text-gray-400">{provider.model}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Query Input */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>💬</span> {t('ai.askCouncil', 'Ask the Council')}
              </h3>
              <div className="space-y-4">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('ai.queryPlaceholder', 'Enter your question for the AI council...')}
                  className="input-primary w-full h-32 resize-none"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleCouncilQuery}
                  disabled={!query.trim() || isProcessing || !isAuthenticated}
                  className="btn-primary w-full py-4 text-lg font-bold"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      {t('ai.consulting', 'Consulting the Council...')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>🔮</span>
                      {t('ai.submitQuery', 'Submit to Council')}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Council Result */}
            {councilResult && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📜</span> {t('ai.councilResponse', 'Council Response')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">
                      {t('ai.confidence', 'Confidence')}: {(councilResult.confidenceScore * 100).toFixed(0)}%
                    </span>
                    <button
                      onClick={() => setShowResponses(!showResponses)}
                      className="text-amber-400 text-sm hover:underline"
                    >
                      {showResponses ? t('ai.hideDetails') : t('ai.showDetails', 'Show Details')}
                    </button>
                  </div>
                </div>

                {/* Final Response */}
                <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                  <div className="prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-gray-200 font-sans">
                      {councilResult.finalResponse}
                    </pre>
                  </div>
                </div>

                {/* Individual Responses */}
                {showResponses && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase">
                      {t('ai.individualResponses', 'Individual Responses')}
                    </h4>
                    {councilResult.individualResponses.map((response, index) => {
                      const provider = LLM_PROVIDERS.find(p => p.id === response.providerId);
                      return (
                        <div
                          key={response.providerId}
                          className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span>{provider?.icon}</span>
                              <span className="font-medium text-white">{response.providerName}</span>
                              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                                #{response.rank}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {response.tokensUsed} tokens • {response.latencyMs}ms
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">{response.response}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400">
                  <span>Session: {councilResult.sessionId}</span>
                  <span>Total time: {councilResult.processingTimeMs}ms</span>
                </div>
              </div>
            )}
          </div>

          {/* Memory & Knowledge Panel */}
          <div className="space-y-6">
            {/* Add Memory */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>💾</span> {t('ai.addMemory', 'Add Memory')}
              </h3>
              <div className="space-y-3">
                <textarea
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  placeholder={t('ai.memoryPlaceholder', 'Enter something to remember...')}
                  className="input-primary w-full h-20 resize-none text-sm"
                />
                <select
                  value={memoryType}
                  onChange={(e) => setMemoryType(e.target.value)}
                  className="input-primary w-full"
                >
                  <option value="short_term">{t('ai.shortTerm', 'Short-term')}</option>
                  <option value="long_term">{t('ai.longTerm', 'Long-term')}</option>
                  <option value="semantic">{t('ai.semantic', 'Semantic')}</option>
                  <option value="episodic">{t('ai.episodic', 'Episodic')}</option>
                </select>
                <input
                  type="text"
                  value={memoryTags}
                  onChange={(e) => setMemoryTags(e.target.value)}
                  placeholder={t('ai.tagsPlaceholder', 'Tags (comma separated)')}
                  className="input-primary w-full text-sm"
                />
                <button
                  onClick={handleAddMemory}
                  disabled={!newMemory.trim() || !isAuthenticated}
                  className="btn-primary w-full py-2"
                >
                  <span>💾</span> {t('ai.saveMemory', 'Save Memory')}
                </button>
              </div>
            </div>

            {/* Memory List */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>📚</span> {t('ai.memories', 'Memories')}
                <span className="text-sm font-normal text-gray-400">({memories.length})</span>
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {memories.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    {t('ai.noMemories', 'No memories yet. Add your first memory above.')}
                  </p>
                ) : (
                  memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="bg-gray-800/50 rounded-lg p-3 border border-gray-700"
                    >
                      <p className="text-gray-300 text-sm mb-2">{memory.content}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            memory.memoryType === 'long_term' 
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {memory.memoryType}
                          </span>
                          {memory.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(memory.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Knowledge Graph Preview */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>🕸️</span> {t('ai.knowledgeGraph', 'Knowledge Graph')}
              </h3>
              <div className="bg-gray-800/50 rounded-lg p-4 h-40 flex items-center justify-center border border-gray-700">
                <div className="text-center">
                  <div className="text-4xl mb-2">🔗</div>
                  <p className="text-gray-400 text-sm">
                    {t('ai.graphPlaceholder', 'Knowledge graph visualization')}
                  </p>
                  <button
                    onClick={() => setShowKnowledgeGraph(true)}
                    className="text-amber-400 text-sm mt-2 hover:underline"
                  >
                    {t('ai.viewGraph', 'View Full Graph')}
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-800/50 rounded p-2 text-center">
                  <div className="text-xl font-bold text-amber-400">{knowledgeNodes.length}</div>
                  <div className="text-gray-400">{t('ai.nodes', 'Nodes')}</div>
                </div>
                <div className="bg-gray-800/50 rounded p-2 text-center">
                  <div className="text-xl font-bold text-amber-400">0</div>
                  <div className="text-gray-400">{t('ai.edges', 'Edges')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 text-center">
            <div className="text-4xl mb-4">🏛️</div>
            <h3 className="text-lg font-bold text-white mb-2">{t('ai.councilTitle', 'LLM Council')}</h3>
            <p className="text-gray-400 text-sm">
              {t('ai.councilDesc', 'Multiple AI models deliberate and reach consensus on your queries for more reliable answers.')}
            </p>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-lg font-bold text-white mb-2">{t('ai.memoryTitle', 'Persistent Memory')}</h3>
            <p className="text-gray-400 text-sm">
              {t('ai.memoryDesc', 'AI agents maintain short and long-term memory, learning from your interactions over time.')}
            </p>
          </div>
          <div className="glass-card p-6 text-center">
            <div className="text-4xl mb-4">🕸️</div>
            <h3 className="text-lg font-bold text-white mb-2">{t('ai.graphTitle', 'Knowledge Graph')}</h3>
            <p className="text-gray-400 text-sm">
              {t('ai.graphDesc', 'Structured knowledge representation with vector embeddings for intelligent retrieval.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIFeaturesPage;






