import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText, Shield, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { newsService } from '../../services/newsService';
import { HaloAssistant } from './HaloAssistant';

interface PlagiarismResult {
  score: number;
  matches: Array<{
    text: string;
    source: string;
    url: string;
    similarity: number;
  }>;
}

interface AIDetectionResult {
  probability: number;
  confidence: number;
  indicators: string[];
}

interface WorksCited {
  id: string;
  title: string;
  author: string;
  url: string;
  date: string;
  format: 'APA' | 'MLA' | 'Chicago';
}

export const ArticleSubmission: React.FC = () => {
  const { identity, isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<'onboarding' | 'upload' | 'checking' | 'review' | 'success'>('onboarding');
  const [articleContent, setArticleContent] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
  const [aiDetectionResult, setAiDetectionResult] = useState<AIDetectionResult | null>(null);
  const [worksCited, setWorksCited] = useState<WorksCited[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!isAuthenticated || !identity) {
      setError('Please connect your wallet to submit articles');
      return;
    }

    setStep('checking');
    setError(null);
    
    try {
      // Ensure service is initialized
      await newsService.init(identity);
      
      // Step 1: Check plagiarism
      const plagiarism = await checkPlagiarism(articleContent);
      setPlagiarismResult(plagiarism);
      
      // Step 2: Check AI detection
      const aiDetection = await checkAIGeneration(articleContent);
      setAiDetectionResult(aiDetection);
      
      // Step 3: Generate works cited if plagiarism detected
      if (plagiarism.score > 15 && plagiarism.matches.length > 0) {
        const citations = await generateWorksCited(articleContent, plagiarism.matches);
        setWorksCited(citations);
      }
      
      setStep('review');
    } catch (error: any) {
      console.error('Error checking article:', error);
      setError(error.message || 'Failed to check article. Please try again.');
      setStep('review');
    }
  };

  const handleAddCitations = () => {
    const citationsSection = formatWorksCited(worksCited);
    setArticleContent(articleContent + '\n\n## Works Cited\n\n' + citationsSection);
  };

  const handleAddAIDisclaimer = () => {
    const disclaimer = "\n\n*This article was written with AI assistance.*\n";
    setArticleContent(articleContent + disclaimer);
  };

  const submitArticle = async () => {
    try {
      // Import newsService to submit article
      const { newsService } = await import('../../services/newsService');
      
      // Submit to backend via newsService
      // Note: This will need to be added to newsService
      const result = await newsService.submitArticle({
        title: articleTitle,
        content: articleContent,
        plagiarismScore: plagiarismResult?.score || 0,
        aiProbability: aiDetectionResult?.probability || 0,
      });

      if (result) {
        setStep('success');
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting article:', error);
      alert('Failed to submit article. Please try again.');
    }
  };

  return (
    <div className="article-submission-container min-h-screen bg-obsidian-950 pt-20 px-4">
      {error && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}
      {!isAuthenticated && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400">Please connect your wallet to submit articles</p>
        </div>
      )}
      <AnimatePresence mode="wait">
        {step === 'onboarding' && (
          <OnboardingFlow onComplete={() => setStep('upload')} />
        )}
        
        {step === 'upload' && (
          <UploadForm
            title={articleTitle}
            content={articleContent}
            onTitleChange={setArticleTitle}
            onContentChange={setArticleContent}
            onSubmit={handleSubmit}
          />
        )}
        
        {step === 'checking' && (
          <CheckingScreen />
        )}
        
        {step === 'review' && (
          <ReviewScreen
            plagiarism={plagiarismResult}
            aiDetection={aiDetectionResult}
            worksCited={worksCited}
            onAddCitations={handleAddCitations}
            onAddAIDisclaimer={handleAddAIDisclaimer}
            onFinalSubmit={submitArticle}
          />
        )}
        
        {step === 'success' && (
          <SuccessScreen />
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper functions - call backend
async function checkPlagiarism(content: string): Promise<PlagiarismResult> {
  try {
    const result = await newsService.checkPlagiarism(content);
    return {
      score: result.score || 0,
      matches: (result.matches || []).map((m: {
        text?: string;
        source_title?: string;
        source_url?: string;
        similarity?: number;
      }) => ({
        text: m.text || '',
        source: m.source_title || 'Unknown',
        url: m.source_url || '',
        similarity: (m.similarity || 0) * 100 // Convert 0-1 to percentage
      }))
    };
  } catch (error) {
    console.error('Plagiarism check failed:', error);
    return { score: 0, matches: [] };
  }
}

async function checkAIGeneration(content: string): Promise<AIDetectionResult> {
  try {
    const result = await newsService.checkAIDetection(content);
    return {
      probability: result.probability || 0,
      confidence: result.confidence || 0,
      indicators: result.indicators || []
    };
  } catch (error) {
    console.error('AI detection failed:', error);
    return { probability: 0, confidence: 0, indicators: [] };
  }
}

async function generateWorksCited(content: string, matches: PlagiarismResult['matches']): Promise<WorksCited[]> {
  try {
    const backendMatches = matches.map(m => ({
      text: m.text,
      source_title: m.source,
      source_author: null,
      source_url: m.url,
      source_date: null,
      similarity: m.similarity / 100 // Convert percentage to 0-1
    }));
    const citations = await newsService.generateWorksCited(backendMatches);
    return (citations || []).map((c: {
      id?: string;
      title?: string;
      author?: string;
      url?: string;
      date?: string;
      format?: { APA?: null } | { MLA?: null } | { Chicago?: null };
    }) => {
      let format: 'APA' | 'MLA' | 'Chicago' = 'APA';
      if (c.format) {
        if ('MLA' in c.format) format = 'MLA';
        else if ('Chicago' in c.format) format = 'Chicago';
      }
      return {
        id: c.id || '',
        title: c.title || 'Unknown',
        author: c.author || 'Unknown',
        url: c.url || '',
        date: c.date || 'n.d.',
        format
      };
    });
  } catch (error) {
    console.error('Works cited generation failed:', error);
    return [];
  }
}

function formatWorksCited(citations: WorksCited[]): string {
  return citations.map(c => {
    if (c.format === 'APA') {
      return `${c.author} (${c.date}). ${c.title}. Retrieved from ${c.url}`;
    } else if (c.format === 'MLA') {
      return `${c.author}. "${c.title}." ${c.date}. Web. ${new Date().toLocaleDateString()}.`;
    } else {
      return `${c.author}. "${c.title}." ${c.date}. ${c.url}`;
    }
  }).join('\n\n');
}

// Onboarding Flow Component
const OnboardingFlow: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      title: "Welcome to Raven News",
      content: "Share your stories with our community. We ensure all content meets journalistic standards.",
      icon: <FileText size={64} className="text-gold-400" />
    },
    {
      title: "Quality Standards",
      content: "All submissions are checked for plagiarism and AI-generated content to maintain credibility.",
      icon: <Shield size={64} className="text-gold-400" />
    },
    {
      title: "Proper Attribution",
      content: "We'll help you create proper citations to give credit where it's due.",
      icon: <CheckCircle size={64} className="text-gold-400" />
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="onboarding-flow"
    >
      <div className="onboarding-slide">
        <div className="slide-icon">{slides[currentSlide].icon}</div>
        <h2 className="text-3xl font-bold mb-4">{slides[currentSlide].title}</h2>
        <p className="text-lg text-gray-300">{slides[currentSlide].content}</p>
      </div>
      
      <div className="onboarding-navigation flex justify-between items-center mt-8">
        {currentSlide > 0 && (
          <button 
            onClick={() => setCurrentSlide(currentSlide - 1)}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg"
          >
            Previous
          </button>
        )}
        {currentSlide < slides.length - 1 ? (
          <button 
            onClick={() => setCurrentSlide(currentSlide + 1)}
            className="px-6 py-2 bg-gold-500 text-black rounded-lg ml-auto"
          >
            Next
          </button>
        ) : (
          <button 
            onClick={onComplete} 
            className="px-6 py-2 bg-gold-500 text-black rounded-lg ml-auto"
          >
            Get Started
          </button>
        )}
      </div>
      
      <div className="progress-dots flex justify-center gap-2 mt-6">
        {slides.map((_, idx) => (
          <span 
            key={idx} 
            className={`w-2 h-2 rounded-full ${idx === currentSlide ? 'bg-gold-400' : 'bg-gray-600'}`}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Upload Form Component
const UploadForm: React.FC<{
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
}> = ({ title, content, onTitleChange, onContentChange, onSubmit }) => {
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="upload-form max-w-4xl mx-auto p-6"
    >
      <h2 className="text-3xl font-bold mb-6">Submit Your Article</h2>
      
      <div className="form-group mb-6">
        <label className="block text-sm font-medium mb-2">Article Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Enter your headline..."
          className="title-input w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        />
      </div>
      
      <div className="form-group mb-4">
        <label className="block text-sm font-medium mb-2">Article Content</label>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Write or paste your article here..."
          className="content-input w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white min-h-[400px]"
          rows={20}
        />
      </div>

      {/* HALO Academic Writing Assistant */}
      {content.trim().length > 100 && (
        <div className="mb-6">
          <HaloAssistant content={content} />
        </div>
      )}
      
      <div className="word-count text-sm text-gray-400 mb-6">
        {wordCount} words {wordCount < 300 && '(Minimum 300 words required)'}
      </div>
      
      <button
        onClick={onSubmit}
        disabled={!title || wordCount < 300}
        className="submit-btn flex items-center gap-2 px-6 py-3 bg-gold-500 text-black rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload size={20} />
        Submit for Review
      </button>
    </motion.div>
  );
};

// Checking Screen Component
const CheckingScreen: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="checking-screen text-center py-20"
    >
      <div className="spinner-container mb-8">
        <Loader2 className="w-16 h-16 text-gold-400 animate-spin mx-auto" />
      </div>
      
      <h3 className="text-2xl font-bold mb-6">Analyzing Your Article</h3>
      
      <div className="check-steps space-y-4 max-w-md mx-auto">
        <div className="check-step flex items-center gap-3 text-left">
          <CheckCircle size={20} className="text-green-400" />
          <span>Scanning for plagiarism...</span>
        </div>
        <div className="check-step flex items-center gap-3 text-left">
          <CheckCircle size={20} className="text-green-400" />
          <span>Detecting AI-generated content...</span>
        </div>
        <div className="check-step flex items-center gap-3 text-left">
          <CheckCircle size={20} className="text-green-400" />
          <span>Verifying sources...</span>
        </div>
      </div>
    </motion.div>
  );
};

// Review Screen Component
const ReviewScreen: React.FC<{
  plagiarism: PlagiarismResult | null;
  aiDetection: AIDetectionResult | null;
  worksCited: WorksCited[];
  onAddCitations: () => void;
  onAddAIDisclaimer: () => void;
  onFinalSubmit: () => void;
}> = ({ plagiarism, aiDetection, worksCited, onAddCitations, onAddAIDisclaimer, onFinalSubmit }) => {
  const plagiarismScore = plagiarism?.score || 0;
  const aiProbability = aiDetection?.probability || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="review-screen max-w-4xl mx-auto p-6"
    >
      <h2 className="text-3xl font-bold mb-6">Article Review</h2>
      
      {/* Plagiarism Results */}
      <div className={`result-card p-6 rounded-lg mb-6 ${plagiarismScore > 15 ? 'bg-yellow-900/20 border-yellow-500' : 'bg-green-900/20 border-green-500'} border-2`}>
        <div className="result-header flex items-center gap-3 mb-4">
          {plagiarismScore > 15 ? <AlertCircle size={24} className="text-yellow-400" /> : <CheckCircle size={24} className="text-green-400" />}
          <h3 className="text-xl font-bold">Plagiarism Check</h3>
        </div>
        <div className="result-body">
          <div className="score-display flex items-center gap-4 mb-4">
            <div className={`score-circle w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${plagiarismScore > 15 ? 'bg-yellow-500' : 'bg-green-500'}`}>
              {plagiarismScore}%
            </div>
            <div className="score-label">
              <div className="text-lg font-semibold">
                {plagiarismScore < 10 ? 'Excellent' : plagiarismScore < 20 ? 'Good' : 'Needs Attribution'}
              </div>
            </div>
          </div>
          
          {plagiarismScore > 15 && plagiarism && plagiarism.matches.length > 0 && (
            <div className="matches-found">
              <p className="mb-3">{plagiarism.matches.length} potential matches found</p>
              {worksCited.length > 0 && (
                <button onClick={onAddCitations} className="view-matches-btn px-4 py-2 bg-gold-500 text-black rounded-lg">
                  Add Citations to Article
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* AI Detection Results */}
      <div className={`result-card p-6 rounded-lg mb-6 ${aiProbability > 0.5 ? 'bg-blue-900/20 border-blue-500' : 'bg-green-900/20 border-green-500'} border-2`}>
        <div className="result-header flex items-center gap-3 mb-4">
          {aiProbability > 0.5 ? <AlertCircle size={24} className="text-blue-400" /> : <CheckCircle size={24} className="text-green-400" />}
          <h3 className="text-xl font-bold">AI Detection</h3>
        </div>
        <div className="result-body">
          <div className="score-display flex items-center gap-4 mb-4">
            <div className={`score-circle w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${aiProbability > 0.5 ? 'bg-blue-500' : 'bg-green-500'}`}>
              {Math.round(aiProbability * 100)}%
            </div>
            <div className="score-label">
              <div className="text-lg font-semibold">
                {aiProbability < 0.3 ? 'Likely Human' : aiProbability < 0.7 ? 'Mixed' : 'Likely AI'}
              </div>
            </div>
          </div>
          
          {aiProbability > 0.5 && (
            <div className="ai-disclaimer-prompt">
              <p className="mb-3">This article appears to have AI assistance.</p>
              <button onClick={onAddAIDisclaimer} className="add-disclaimer-btn px-4 py-2 bg-blue-500 text-white rounded-lg">
                Add AI Disclaimer
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Final Submit Button */}
      <button
        onClick={onFinalSubmit}
        className="final-submit-btn w-full px-6 py-3 bg-gold-500 text-black rounded-lg font-semibold text-lg"
        disabled={plagiarismScore > 15 && worksCited.length === 0}
      >
        Publish Article
      </button>
    </motion.div>
  );
};

// Success Screen Component
const SuccessScreen: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="success-screen text-center py-20"
    >
      <CheckCircle size={80} className="text-green-400 mx-auto mb-6" />
      <h2 className="text-3xl font-bold mb-4">Article Submitted Successfully!</h2>
      <p className="text-lg text-gray-300 mb-6">
        Your article is under review and will be published soon.
      </p>
      <button
        onClick={() => window.location.href = '/news'}
        className="px-6 py-3 bg-gold-500 text-black rounded-lg font-semibold"
      >
        Return to News
      </button>
    </motion.div>
  );
};

