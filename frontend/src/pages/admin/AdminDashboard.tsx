/**
 * Admin Dashboard (Focused)
 * - Configure AI keys (LLM + ElevenLabs) for mainnet operation
 * - Upload AXIOM WASM (used by raven_ai mint orchestration)
 *
 * This replaces an older draft dashboard that referenced many unfinished services.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Eye, EyeOff, FileText, Key, Loader2, RefreshCw, Upload, Zap } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ravenAICanisterService } from '../../services/ravenAICanisterService';

export default function AdminDashboard() {
  const { isAdmin } = useAuthStore();

  const [showSecrets, setShowSecrets] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [llmProviders, setLlmProviders] = useState<Array<{ name: string; ready: boolean }>>([]);
  const [hfApiKey, setHfApiKey] = useState('');
  const [perplexityApiKey, setPerplexityApiKey] = useState('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');

  const inputType = useMemo(() => (showSecrets ? 'text' : 'password'), [showSecrets]);

  async function initAdminActor() {
    const identity = useAuthStore.getState().identity;
    if (!identity) {
      throw new Error('No identity found. Please reconnect your wallet.');
    }
    await ravenAICanisterService.init(identity);
  }

  async function refreshProviders() {
    setError(null);
    setMessage(null);
    setIsLoading(true);
    try {
      await initAdminActor();
      const providers = await ravenAICanisterService.getLlmProviders();
      setLlmProviders(providers);
      setMessage('Provider status refreshed.');
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh provider status');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      refreshProviders().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-24 px-4 text-white">
        <div className="max-w-3xl mx-auto glass rounded-2xl p-8 border border-gray-800">
          <h1 className="text-2xl font-bold mb-2">Admin</h1>
          <p className="text-gray-300">You must be logged in as an admin principal to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 text-white">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass rounded-2xl p-8 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-yellow-300" />
              <h1 className="text-3xl font-bold">Admin Control Panel</h1>
            </div>
            <p className="text-gray-300">
              Configure RavenAI for real mainnet operation (Raven News generation, HALO citations, LLM Council, ElevenLabs voice).
            </p>

            {error && (
              <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 text-sm">{error}</div>
            )}
            {message && (
              <div className="mt-4 p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 text-sm">{message}</div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="p-5 rounded-2xl border border-gray-800 bg-black/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Key className="w-5 h-5 text-yellow-300" />
                    AI Keys (Admin)
                  </h2>
                  <button
                    onClick={() => setShowSecrets((v) => !v)}
                    className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white flex items-center gap-2 text-sm"
                  >
                    {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showSecrets ? 'Hide' : 'Show'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">HuggingFace API Key</label>
                    <input
                      type={inputType}
                      value={hfApiKey}
                      onChange={(e) => setHfApiKey(e.target.value)}
                      placeholder="hf_..."
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Perplexity API Key</label>
                    <input
                      type={inputType}
                      value={perplexityApiKey}
                      onChange={(e) => setPerplexityApiKey(e.target.value)}
                      placeholder="pplx_..."
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">ElevenLabs API Key</label>
                    <input
                      type={inputType}
                      value={elevenLabsApiKey}
                      onChange={(e) => setElevenLabsApiKey(e.target.value)}
                      placeholder="sk_..."
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                    />
                  </div>

                  <button
                    disabled={isLoading}
                    onClick={async () => {
                      setError(null);
                      setMessage(null);
                      setIsLoading(true);
                      try {
                        await initAdminActor();
                        if (hfApiKey.trim()) await ravenAICanisterService.adminSetLlmApiKey('HuggingFace', hfApiKey.trim());
                        if (perplexityApiKey.trim()) await ravenAICanisterService.adminSetLlmApiKey('Perplexity', perplexityApiKey.trim());
                        if (elevenLabsApiKey.trim()) await ravenAICanisterService.adminSetElevenLabsApiKey(elevenLabsApiKey.trim());
                        await refreshProviders();
                        setMessage('Keys saved and provider status refreshed.');
                      } catch (e: any) {
                        setError(e?.message || 'Failed to save keys');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-semibold hover:from-yellow-400 hover:to-amber-300 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Save Keys
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-gray-800 bg-black/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-300" />
                    Provider Readiness
                  </h2>
                  <button
                    disabled={isLoading}
                    onClick={refreshProviders}
                    className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  {llmProviders.length === 0 ? (
                    <div className="text-gray-400">No providers loaded.</div>
                  ) : (
                    llmProviders.map((p) => (
                      <div key={p.name} className="flex items-center justify-between">
                        <span className="text-gray-200">{p.name}</span>
                        <span className={p.ready ? 'text-green-300' : 'text-yellow-300'}>{p.ready ? 'ready' : 'missing key'}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 border-t border-gray-800 pt-5">
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-amber-300" />
                    AXIOM WASM Upload
                  </h2>
                  <p className="text-gray-400 text-sm mb-3">
                    Upload the AXIOM canister WASM that `raven_ai` uses when minting dedicated AXIOM agent canisters.
                  </p>
                  <input
                    id="axiom-wasm-upload"
                    type="file"
                    accept=".wasm"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setError(null);
                      setMessage(null);
                      setIsLoading(true);
                      try {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const arrayBuffer = event.target?.result as ArrayBuffer;
                            const bytes = new Uint8Array(arrayBuffer);
                            await initAdminActor();
                            const res = await ravenAICanisterService.adminUploadAxiomWasm(bytes);
                            if ('Err' in res) throw new Error(res.Err);
                            setMessage('AXIOM WASM uploaded successfully.');
                          } catch (err: any) {
                            setError(err?.message || 'AXIOM WASM upload failed');
                          } finally {
                            setIsLoading(false);
                          }
                        };
                        reader.readAsArrayBuffer(file);
                      } catch (err: any) {
                        setError(err?.message || 'AXIOM WASM upload failed');
                        setIsLoading(false);
                      }
                    }}
                  />
                  <label
                    htmlFor="axiom-wasm-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Select WASM File
                  </label>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


