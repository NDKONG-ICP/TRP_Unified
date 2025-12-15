import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle, 
  BookOpen, 
  Shield,
  Zap,
  Award,
  ArrowRight,
  FileCheck,
  FileSearch,
  PenTool
} from 'lucide-react';
import { HALOUpload } from '../../components/halo/HALOUpload';
import { HALOResults } from '../../components/halo/HALOResults';

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

export default function HALOPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<HALOResult | null>(null);
  const [showUpload, setShowUpload] = useState(true);

  const handleFileProcessed = (result: HALOResult) => {
    setResult(result);
    setShowUpload(false);
    setProcessing(false);
  };

  const handleNewUpload = () => {
    setUploadedFile(null);
    setResult(null);
    setShowUpload(true);
  };

  return (
    <div 
      className="min-h-screen pt-20 pb-12 relative"
      style={{
        backgroundImage: 'url(/halo.GIF)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-indigo-900/80 to-blue-900/80"></div>
      
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl mb-6 shadow-2xl">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            HALO
          </h1>
          <p className="text-2xl md:text-3xl text-purple-200 mb-2">
            Academic Writing Assistant
          </p>
          <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
            Format. Cite. Perfect. Automatically.
          </p>
        </motion.div>

        {/* Features Section */}
        {showUpload && !result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6 mb-12"
          >
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/30 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Auto-Formatting</h3>
              <p className="text-gray-300">
                MLA, APA, Chicago, Harvard, IEEE - All citation formats supported automatically
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/30 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Intelligent Rewriting</h3>
              <p className="text-gray-300">
                Maintain your voice while improving clarity and academic tone
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/30 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Works Cited</h3>
              <p className="text-gray-300">
                99.9% accurate citation generation from web sources and academic databases
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/30 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Plagiarism Check</h3>
              <p className="text-gray-300">
                Comprehensive plagiarism detection with source matching
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/30 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Grammar & Style</h3>
              <p className="text-gray-300">
                Advanced grammar checking and academic writing style suggestions
              </p>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/30 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Perfect Results</h3>
              <p className="text-gray-300">
                Download formatted documents ready for submission
              </p>
            </div>
          </motion.div>
        )}

        {/* Upload Section */}
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <HALOUpload
              onFileSelect={setUploadedFile}
              onProcess={handleFileProcessed}
              processing={processing}
              setProcessing={setProcessing}
            />
          </motion.div>
        )}

        {/* Results Section */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-3xl font-bold text-white">Processing Results</h2>
              <button
                onClick={handleNewUpload}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Process New Document
              </button>
            </div>
            <HALOResults result={result} />
          </motion.div>
        )}

        {/* Pricing Section (Optional) */}
        {showUpload && !result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16 text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-8">Simple Pricing</h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                <p className="text-4xl font-bold text-purple-300 mb-4">$0</p>
                <ul className="text-left text-gray-300 space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    3 documents/month
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Basic formatting
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Plagiarism check
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-purple-500/90 to-indigo-600/90 backdrop-blur-md rounded-2xl p-8 border-2 border-white/30 transform scale-105 shadow-2xl">
                <div className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full inline-block mb-2">
                  POPULAR
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Student</h3>
                <p className="text-4xl font-bold text-white mb-4">$9.99<span className="text-lg">/mo</span></p>
                <ul className="text-left text-white space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Unlimited documents
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    All citation formats
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Advanced rewriting
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Priority processing
                  </li>
                </ul>
                <button className="w-full px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-100 transition-all">
                  Get Started
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                <p className="text-4xl font-bold text-purple-300 mb-4">$19.99<span className="text-lg">/mo</span></p>
                <ul className="text-left text-gray-300 space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Everything in Student
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    API access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Custom templates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Priority support
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

