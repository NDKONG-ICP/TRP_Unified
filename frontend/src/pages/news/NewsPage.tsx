/**
 * Raven News - Decentralized News & Meme Platform
 * Features: 
 * - Article publishing with full expansion, sharing, and tipping
 * - Meme uploads with Markdown, comments, reactions
 * - AI Plagiarism Scanner with works cited generation
 * - $HARLEE token rewards
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Newspaper, 
  TrendingUp, 
  Users, 
  Award, 
  MessageSquare, 
  ArrowRight,
  Heart,
  Share2,
  Bookmark,
  Coins,
  Flame,
  Clock,
  Image,
  PenTool,
  ThumbsUp,
  ExternalLink,
  Star,
  X,
  Send,
  Upload,
  AlertTriangle,
  CheckCircle,
  Copy,
  Twitter,
  Facebook,
  Linkedin,
  Link2,
  Eye,
  ThumbsDown,
  MessageCircle,
  FileText,
  Search,
  Sparkles,
  Loader2,
  Activity,
  DollarSign,
  Globe
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { TOKEN_CANISTERS, formatHarlee } from '../../services/tokenService';
import { newsService, useArticles, type Article as NewsArticle } from '../../services/newsService';
import WalletModal from '../../components/shared/WalletModal';
import { NewspaperLayout } from '../../components/news/NewspaperLayout';
import { ArticleSubmission } from '../../components/news/ArticleSubmission';

// Use service Article type as the base, extend if needed
type Article = NewsArticle;

// $HARLEE Token
const HARLEE_TOKEN = TOKEN_CANISTERS.HARLEE;

// Use service types directly to avoid mismatches
type Article = NewsArticle;
type Comment = import('../../services/newsService').Comment;

// Extend Article type to include optional image for UI
interface ArticleWithImage extends Article {
  image?: string;
}

// Meme Types
interface Meme {
  id: string;
  title: string;
  image: string;
  imageUrl?: string;
  author: string;
  authorPrincipal: string;
  votes: number;
  downvotes: number;
  harleeRewards: bigint;
  isSpicy: boolean;
  comments: Comment[];
  createdAt: string;
}

// Plagiarism Result
interface PlagiarismResult {
  isPlagiarized: boolean;
  matchPercentage: number;
  sources: Array<{
    url: string;
    title: string;
    matchPercentage: number;
  }>;
  worksCited?: string;
}

// Mock data removed - using backend via useArticles hook

// Category Badge Component - Supports all categories
function CategoryBadge({ category }: { category: Article['category'] }) {
  const styles: Record<string, string> = {
    news: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    crypto: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    tech: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    meme: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    spicy: 'bg-red-500/20 text-red-400 border-red-500/30',
    health: 'bg-green-500/20 text-green-400 border-green-500/30',
    finance: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    news: Newspaper,
    crypto: Coins,
    tech: TrendingUp,
    meme: Image,
    spicy: Flame,
    health: Activity,
    finance: DollarSign,
    general: Globe,
  };

  // Get icon with fallback
  const Icon = icons[category] || Newspaper;
  const styleClass = styles[category] || styles.news;
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styleClass}`}>
      <Icon className="w-3 h-3" />
      {categoryLabel}
    </span>
  );
}

// Share Modal Component
function ShareModal({ article, onClose }: { article: ArticleWithImage; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  // Ensure article is properly typed and has url
  const articleForUrl = article as NewsArticle | Article;
  const shareUrl = (articleForUrl as any).url || newsService.getArticleUrl(articleForUrl as NewsArticle);
  
  // Update page URL when sharing (for SEO)
  useEffect(() => {
    if (shareUrl && typeof window !== 'undefined') {
      // Update URL without page reload for better UX
      window.history.replaceState({}, '', shareUrl);
    }
  }, [shareUrl]);
  
  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await newsService.shareArticle(article.id);
    } catch (error) {
      console.error('Failed to record share:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { name: 'Twitter', icon: Twitter, url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`, color: 'text-blue-400' },
    { name: 'Facebook', icon: Facebook, url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, color: 'text-blue-600' },
    { name: 'LinkedIn', icon: Linkedin, url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(article.title)}`, color: 'text-blue-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="glass rounded-2xl p-6 max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Share Article</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 mb-6 justify-center">
          {shareOptions.map(option => (
            <a
              key={option.name}
              href={option.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleShare}
              className={`p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors ${option.color}`}
            >
              <option.icon className="w-6 h-6" />
            </a>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
          />
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 flex items-center gap-2"
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Tip Modal Component
function TipModal({ recipient, onClose, onTip, isTipping }: { recipient: string; onClose: () => void; onTip: (amount: bigint) => void; isTipping?: boolean }) {
  const [amount, setAmount] = useState('');
  const tipAmounts = [
    { label: '0.1 $HARLEE', value: BigInt(10_000_000) },
    { label: '1 $HARLEE', value: BigInt(100_000_000) },
    { label: '5 $HARLEE', value: BigInt(500_000_000) },
    { label: '10 $HARLEE', value: BigInt(1_000_000_000) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="glass rounded-2xl p-6 max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">💰 Send Tip</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-400 mb-4">Send $HARLEE to <span className="text-amber-400">{recipient}</span></p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {tipAmounts.map(tip => (
            <button
              key={tip.label}
              onClick={() => onTip(tip.value)}
              className="p-3 rounded-xl border border-gray-700 hover:border-amber-500 hover:bg-amber-500/10 transition-all text-center"
            >
              <span className="text-white font-bold">{tip.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Custom amount"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          />
          <button
            onClick={() => amount && onTip(BigInt(parseFloat(amount) * 100_000_000))}
            disabled={!amount || (isTipping ?? false)}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-lg disabled:opacity-50"
          >
            {isTipping ? 'Sending...' : 'Send'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Full Article Modal Component
function ArticleModal({ article, onClose }: { article: ArticleWithImage; onClose: () => void }) {
  const { isAuthenticated, principal, identity } = useAuthStore();
  const [showShare, setShowShare] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isTipping, setIsTipping] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Update SEO meta tags when article is opened
  useEffect(() => {
    const updateMetaTags = () => {
      // Update title
      document.title = `${article.seoTitle || article.title} | Raven News`;
      
      // Update meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', article.seoDescription || article.excerpt);
      
      // Update Open Graph tags
      const updateOGTag = (property: string, content: string) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('property', property);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      };
      
      // Ensure article has required properties for URL generation
      const articleForUrl = article as any;
      const articleUrl = articleForUrl.url || newsService.getArticleUrl(articleForUrl);
      updateOGTag('og:title', article.seoTitle || article.title);
      updateOGTag('og:description', article.seoDescription || article.excerpt);
      updateOGTag('og:url', articleUrl);
      updateOGTag('og:type', 'article');
      
      // Update Twitter tags
      updateOGTag('twitter:title', article.seoTitle || article.title);
      updateOGTag('twitter:description', article.seoDescription || article.excerpt);
      updateOGTag('twitter:url', articleUrl);
      
      // Add keywords meta tag
      if (article.seoKeywords && article.seoKeywords.length > 0) {
        let keywordsTag = document.querySelector('meta[name="keywords"]');
        if (!keywordsTag) {
          keywordsTag = document.createElement('meta');
          keywordsTag.setAttribute('name', 'keywords');
          document.head.appendChild(keywordsTag);
        }
        keywordsTag.setAttribute('content', article.seoKeywords.join(', '));
      }
    };
    
    updateMetaTags();
    
    // Restore original title on unmount
    return () => {
      document.title = 'The Raven Project | Multi-Chain AI Agent NFTs';
    };
  }, [article]);

  const handleComment = async () => {
    if (!newComment.trim() || !article || isAddingComment) return;
    
    setIsAddingComment(true);
    try {
      const newCommentObj = await newsService.addComment(article.id, newComment);
      setComments([...comments, newCommentObj]);
      setNewComment('');
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      alert(`Failed to add comment: ${error.message}`);
    } finally {
      setIsAddingComment(false);
    }
  };

  // Fetch comments when article is opened
  useEffect(() => {
    const fetchComments = async () => {
      if (article) {
        setIsLoadingComments(true);
        try {
          const fetchedComments = await newsService.getComments(article.id);
          setComments(fetchedComments);
        } catch (error) {
          console.error('Failed to fetch comments:', error);
        } finally {
          setIsLoadingComments(false);
        }
      }
    };
    
    fetchComments();
  }, [article]);

  const handleTip = async (amount: bigint) => {
    if (!isAuthenticated || !principal || !identity) {
      alert('Please authenticate to send tips');
      return;
    }

    setIsTipping(true);
    try {
      // Distribute HARLEE rewards to article author
      // Note: In production, article.authorPrincipal would be the actual principal
      // For now, we'll use a placeholder and the backend will track rewards
      await newsService.distributeHarleeRewards(
        article.id,
        principal.toString(), // Contributor (tipper)
        amount
      );
      
      alert(`Sent ${formatHarlee(amount)} $HARLEE to ${article.author}!`);
      setShowTip(false);
    } catch (error: any) {
      console.error('Tip error:', error);
      alert(`Failed to send tip: ${error.message}`);
    } finally {
      setIsTipping(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/90"
    >
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <button onClick={onClose} className="text-gray-400 hover:text-white flex items-center gap-2">
              <X className="w-5 h-5" /> Close
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowShare(true)}
                className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowTip(true)}
                disabled={isTipping}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold flex items-center gap-2 disabled:opacity-50"
              >
                <Coins className="w-4 h-4" /> {isTipping ? 'Sending...' : 'Tip Author'}
              </button>
            </div>
          </div>

          {/* Article */}
          <article className="glass rounded-3xl p-8">
            <CategoryBadge category={article.category} />
            
            <h1 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-4">
              {article.title}
            </h1>

            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-800">
              <span className="text-3xl">{article.authorAvatar || '👤'}</span>
              <div>
                <p className="font-bold text-white">{article.author}</p>
                <p className="text-sm text-gray-500">
                  {new Date(article.publishedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })} · {article.readTime} min read
                </p>
              </div>
              <div className="ml-auto flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {article.likes}</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /> {comments.length}</span>
                <span className="flex items-center gap-1"><Share2 className="w-4 h-4" /> {article.shares}</span>
              </div>
            </div>

            {/* Article Content - Rendered as Markdown-like */}
            <div className="prose prose-invert prose-amber max-w-none">
              {article.content.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-2xl font-bold text-white mt-6 mb-4">{line.slice(2)}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-xl font-bold text-white mt-6 mb-3">{line.slice(3)}</h2>;
                } else if (line.startsWith('### ')) {
                  return <h3 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(4)}</h3>;
                } else if (line.startsWith('> ')) {
                  return <blockquote key={i} className="border-l-4 border-amber-500 pl-4 italic text-gray-400 my-4">{line.slice(2)}</blockquote>;
                } else if (line.startsWith('- ')) {
                  return <li key={i} className="text-gray-300 ml-4">{line.slice(2)}</li>;
                } else if (line.startsWith('---')) {
                  return <hr key={i} className="my-8 border-gray-800" />;
                } else if (line.trim()) {
                  return <p key={i} className="text-gray-300 mb-4 leading-relaxed">{line}</p>;
                }
                return null;
              })}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-800">
              {article.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-sm">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Check if article is too short (outline) and show warning/regenerate option */}
            {(() => {
              const wordCount = article.content.split(/\s+/).length;
              const isOutline = wordCount < 800 || article.content.includes('ERROR:') || article.content.includes('[Note:');
              
              if (isOutline) {
                return (
                  <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-red-400 font-bold mb-2">Article Incomplete</p>
                        <p className="text-gray-400 text-sm mb-3">
                          This article appears to be an outline ({wordCount} words) rather than a full article. 
                          Please regenerate to get the complete content.
                        </p>
                        {isAuthenticated && (
                          <button
                            onClick={async () => {
                              try {
                                setIsGenerating(true);
                                await newsService.regenerateArticle(article.id);
                                // Refresh the article
                                const refreshed = await newsService.getArticle(article.id);
                                if (refreshed) {
                                  setSelectedArticle(refreshed as any);
                                }
                                await refreshArticles();
                              } catch (error: any) {
                                alert(`Failed to regenerate: ${error.message}`);
                              } finally {
                                setIsGenerating(false);
                              }
                            }}
                            disabled={isGenerating}
                            className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                          >
                            {isGenerating ? '🔄 Regenerating...' : '🔄 Regenerate Full Article'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Show regenerate button for authenticated users even if article is complete
              if (isAuthenticated) {
                return (
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <button
                      onClick={async () => {
                        if (confirm('Regenerate this article with fresh content? This will replace the current content.')) {
                          try {
                            setIsGenerating(true);
                            await newsService.regenerateArticle(article.id);
                            // Refresh the article
                            const refreshed = await newsService.getArticle(article.id);
                            if (refreshed) {
                              setSelectedArticle(refreshed as any);
                            }
                            await refreshArticles();
                          } catch (error: any) {
                            alert(`Failed to regenerate: ${error.message}`);
                          } finally {
                            setIsGenerating(false);
                          }
                        }
                      }}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? '🔄 Regenerating...' : '🔄 Regenerate Article'}
                    </button>
                  </div>
                );
              }
              
              return null;
            })()}

            {/* Rewards Banner */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400 font-bold">Author Rewards</p>
                  <p className="text-gray-400 text-sm">Earned from engagement on this article</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-400">{formatHarlee(article.harleeRewards)}</p>
                  <p className="text-xs text-gray-500">$HARLEE</p>
                </div>
              </div>
            </div>
          </article>

          {/* Comments Section */}
          <div className="glass rounded-3xl p-8 mt-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> Comments ({comments.length})
            </h3>

            {/* Comment Input */}
            {isAuthenticated ? (
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  disabled={isAddingComment}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none disabled:opacity-50"
                  onKeyDown={e => e.key === 'Enter' && !isAddingComment && handleComment()}
                />
                <button
                  onClick={handleComment}
                  disabled={!newComment.trim() || isAddingComment}
                  className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 disabled:opacity-50"
                >
                  {isAddingComment ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            ) : (
              <p className="text-gray-500 mb-6">Connect your wallet to comment</p>
            )}

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="text-center py-8 text-gray-500">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No comments yet. Be the first to comment!</div>
            ) : (
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{comment.author}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.timestamp).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {comment.edited && <span className="text-xs text-gray-600">(edited)</span>}
                      </div>
                      <button 
                        onClick={async () => {
                          try {
                            const newLikes = await newsService.likeComment(comment.id);
                            setComments(comments.map(c => 
                              c.id === comment.id ? { ...c, likes: newLikes } : c
                            ));
                          } catch (error) {
                            console.error('Failed to like comment:', error);
                          }
                        }}
                        className="text-gray-500 hover:text-amber-400 flex items-center gap-1 text-sm transition-colors"
                      >
                        <Heart className="w-4 h-4" /> {comment.likes}
                      </button>
                    </div>
                    <p className="text-gray-300">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showShare && <ShareModal article={article} onClose={() => setShowShare(false)} />}
      {showTip && <TipModal recipient={article.author} onClose={() => setShowTip(false)} onTip={handleTip} isTipping={isTipping} />}
    </motion.div>
  );
}

// Article Card Component
function ArticleCard({ article, featured = false, onExpand }: { article: ArticleWithImage; featured?: boolean; onExpand: () => void }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(article.likes);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking || liked) return;
    
    setIsLiking(true);
    try {
      const newLikes = await newsService.likeArticle(article.id);
      setLikes(newLikes);
      setLiked(true);
    } catch (error) {
      console.error('Failed to like article:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`glass rounded-2xl overflow-hidden border border-news-indigo/20 hover:border-news-indigo/40 transition-all cursor-pointer ${
        featured ? 'col-span-full md:col-span-2' : ''
      }`}
      onClick={onExpand}
    >
      <div className={`p-5 md:p-6 ${featured ? 'md:flex md:gap-6' : ''}`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <CategoryBadge category={article.category} />
            <span className="text-xs text-silver-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {article.readTime} min read
            </span>
            {article.featured && (
              <span className="text-xs text-gold-400 flex items-center gap-1">
                <Star className="w-3 h-3" />
                Featured
              </span>
            )}
          </div>

          <h3 className={`font-bold text-white mb-2 hover:text-news-indigo transition-colors ${
            featured ? 'text-xl md:text-2xl' : 'text-lg'
          }`}>
            {article.title}
          </h3>

          <p className="text-silver-400 text-sm mb-4 line-clamp-2">
            {article.excerpt}
          </p>

            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{article.authorAvatar || '👤'}</span>
              <div>
                <p className="text-sm font-medium text-white">{article.author}</p>
                <p className="text-xs text-silver-500">
                  {new Date(article.publishedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 px-2 py-1 bg-gold-500/10 rounded-lg">
              <Coins className="w-4 h-4 text-gold-400" />
              <span className="text-sm text-gold-400 font-medium">
                +{formatHarlee(article.harleeRewards)}
              </span>
            </div>
          </div>
        </div>

        <div className={`flex items-center gap-4 mt-4 pt-4 border-t border-gray-800 ${
          featured ? 'md:border-t-0 md:border-l md:pt-0 md:pl-6 md:mt-0 md:flex-col md:items-start' : ''
        }`}>
          <button
            onClick={handleLike}
            disabled={isLiking || liked}
            className={`flex items-center gap-1 text-sm ${liked ? 'text-pink-400' : 'text-silver-500 hover:text-pink-400'} transition-colors disabled:opacity-50`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            {likes}
          </button>
          <span className="flex items-center gap-1 text-sm text-silver-500">
            <MessageSquare className="w-4 h-4" />
            {article.comments.length}
          </span>
          <span className="flex items-center gap-1 text-sm text-silver-500">
            <Share2 className="w-4 h-4" />
            {article.shares}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setSaved(!saved); }}
            className={`ml-auto ${saved ? 'text-news-indigo' : 'text-silver-500 hover:text-news-indigo'} transition-colors`}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Meme Upload Modal
function MemeUploadModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (meme: Partial<Meme>) => void }) {
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!title) return;
    onSubmit({
      title,
      imageUrl: imagePreview || imageUrl,
      image: '🔥',
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="glass rounded-2xl p-6 max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">🔥 Upload Meme</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Give your meme a catchy title..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Image</label>
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center hover:border-pink-500 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">Click to upload or drag and drop</p>
                  <p className="text-gray-500 text-sm">PNG, JPG, GIF up to 5MB</p>
                </>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Or paste image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-400 text-sm flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Earn $HARLEE based on votes and engagement!
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50"
          >
            🚀 Submit Meme
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Article Submission Modal with Plagiarism Scanner
function ArticleSubmitModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (article: Partial<Article>) => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Article['category']>('news');
  const [tags, setTags] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);

  // AI Plagiarism Scanner
  const scanForPlagiarism = async () => {
    if (!content) return;
    
    setIsScanning(true);
    
    // Simulate AI plagiarism check
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulated result (in production, this would call an actual AI service)
    const result: PlagiarismResult = {
      isPlagiarized: Math.random() > 0.7,
      matchPercentage: Math.floor(Math.random() * 30),
      sources: Math.random() > 0.5 ? [
        { url: 'https://example.com/article1', title: 'Similar Article on Example.com', matchPercentage: 15 },
        { url: 'https://news.site/post', title: 'Related Post on News Site', matchPercentage: 8 },
      ] : [],
      worksCited: '',
    };

    // Generate works cited if sources found
    if (result.sources.length > 0) {
      result.worksCited = `## Works Cited\n\n${result.sources.map((s, i) => 
        `${i + 1}. "${s.title}" - ${s.url}`
      ).join('\n')}`;
    }

    setPlagiarismResult(result);
    setIsScanning(false);
  };

  const handleSubmit = () => {
    if (!title || !content) return;
    
    onSubmit({
      title,
      content,
      excerpt: content.slice(0, 150) + '...',
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80"
    >
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="glass rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">📝 Write Article</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Enter a compelling title..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Category</label>
                <div className="flex gap-2 flex-wrap">
                  {(['news', 'crypto', 'tech'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        category === cat
                          ? 'bg-amber-500 text-black'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-gray-400">Content (Markdown supported)</label>
                  <button
                    onClick={scanForPlagiarism}
                    disabled={!content || isScanning}
                    className="flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                    {isScanning ? 'Scanning...' : 'Check Plagiarism'}
                  </button>
                </div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your article in Markdown format...

# Heading
## Subheading
- Bullet point
> Quote

Regular paragraph text..."
                  rows={15}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none font-mono text-sm"
                />
              </div>

              {/* Plagiarism Results */}
              <AnimatePresence>
                {plagiarismResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-4 rounded-xl border ${
                      plagiarismResult.isPlagiarized
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-green-500/10 border-green-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {plagiarismResult.isPlagiarized ? (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                      <span className={`font-bold ${plagiarismResult.isPlagiarized ? 'text-red-400' : 'text-green-400'}`}>
                        {plagiarismResult.matchPercentage}% match detected
                      </span>
                    </div>

                    {plagiarismResult.sources.length > 0 && (
                      <>
                        <p className="text-gray-400 text-sm mb-3">Similar sources found:</p>
                        <div className="space-y-2">
                          {plagiarismResult.sources.map((source, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm truncate flex-1">
                                {source.title}
                              </a>
                              <span className="text-gray-500 text-xs ml-2">{source.matchPercentage}%</span>
                            </div>
                          ))}
                        </div>

                        {plagiarismResult.worksCited && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-400">Auto-generated Works Cited:</span>
                              <button
                                onClick={() => {
                                  setContent(content + '\n\n' + plagiarismResult.worksCited);
                                }}
                                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" /> Add to Article
                              </button>
                            </div>
                            <pre className="p-3 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto">
                              {plagiarismResult.worksCited}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="ICP, DeFi, Web3, ..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-amber-400 text-sm flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Earn $HARLEE based on reads, likes, and tips!
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!title || !content}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl hover:shadow-lg disabled:opacity-50"
                >
                  📤 Publish Article
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Meme Card Component with comments and reactions
function MemeCard({ meme, onComment }: { meme: Meme; onComment: (memeId: string) => void }) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(meme.comments);

  const handleComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: `c${Date.now()}`,
      author: 'You',
      authorPrincipal: '...',
      content: newComment,
      timestamp: Date.now(), // Timestamp in milliseconds (matches service conversion)
      likes: 0,
    };
    setComments([...comments, comment]);
    setNewComment('');
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass rounded-2xl overflow-hidden border border-pink-500/20 hover:border-pink-500/40 transition-all"
    >
      {/* Spicy Badge */}
      {meme.isSpicy && (
        <div className="flex items-center gap-1 p-3 bg-red-500/10 border-b border-red-500/20">
          <Flame className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400 font-medium">🔥 SPICY</span>
        </div>
      )}

      {/* Meme Content */}
      <div className="p-4">
        {meme.imageUrl ? (
          <img src={meme.imageUrl} alt={meme.title} className="w-full h-48 object-cover rounded-lg mb-3" />
        ) : (
          <div className="text-6xl text-center py-8 mb-3">{meme.image}</div>
        )}
        <h4 className="text-sm font-medium text-white text-center mb-3">{meme.title}</h4>

        {/* Author & Rewards */}
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-silver-500">by {meme.author}</span>
          <span className="text-gold-400 flex items-center gap-1">
            <Coins className="w-3 h-3" />
            +{formatHarlee(meme.harleeRewards)}
          </span>
        </div>

        {/* Vote Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setVoted(voted === 'up' ? null : 'up')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              voted === 'up'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-800 text-silver-400 hover:bg-green-500/10 hover:text-green-400'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${voted === 'up' ? 'fill-current' : ''}`} />
            {meme.votes + (voted === 'up' ? 1 : 0)}
          </button>
          <button
            onClick={() => setVoted(voted === 'down' ? null : 'down')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              voted === 'down'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-gray-800 text-silver-400 hover:bg-red-500/10 hover:text-red-400'
            }`}
          >
            <ThumbsDown className={`w-4 h-4 ${voted === 'down' ? 'fill-current' : ''}`} />
            {meme.downvotes + (voted === 'down' ? 1 : 0)}
          </button>
        </div>

        {/* Comments Toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="w-full py-2 rounded-lg text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2 bg-gray-800/50"
        >
          <MessageCircle className="w-4 h-4" />
          {comments.length} Comments
        </button>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                {comments.map(comment => (
                  <div key={comment.id} className="p-2 rounded-lg bg-gray-800/50 text-sm">
                    <span className="font-bold text-white">{comment.author}:</span>{' '}
                    <span className="text-gray-300">{comment.content}</span>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add comment..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                    onKeyDown={e => e.key === 'Enter' && handleComment()}
                  />
                  <button
                    onClick={handleComment}
                    className="px-3 py-2 bg-pink-500 text-white rounded-lg"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Main Page Component
export default function NewsPage() {
  const { t } = useTranslation();
  const { isAuthenticated, identity, principal } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'articles' | 'memes'>('articles');
  const [totalRewards, setTotalRewards] = useState<bigint>(BigInt(0));
  const [selectedArticle, setSelectedArticle] = useState<ArticleWithImage | null>(null);
  const [showMemeUpload, setShowMemeUpload] = useState(false);
  const [showArticleSubmit, setShowArticleSubmit] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [useNewspaperLayout, setUseNewspaperLayout] = useState(false);

  // Update SEO meta tags for the news page
  useEffect(() => {
    document.title = 'Raven News | Decentralized News & Meme Platform';
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'Decentralized news and meme platform powered by AI. Earn $HARLEE tokens for quality content. Built on Internet Computer.');
    }
  }, []);

  // Fetch articles from backend
  const { articles, isLoading: articlesLoading, error: articlesError, refresh: refreshArticles } = useArticles(
    { limit: 50 },
    identity
  );

  // Calculate total rewards from articles
  useEffect(() => {
    const total = articles.reduce((sum, article) => sum + article.harleeRewards, BigInt(0));
    setTotalRewards(total);
  }, [articles]);

  // Initialize news service and fetch memes
  useEffect(() => {
    if (identity) {
      newsService.init(identity).catch(console.error);
      // Fetch memes from backend (if available)
      // For now, memes are handled separately - can be added to backend later
    }
  }, [identity]);

  // Check if we're on the submit page
  const location = useLocation();
  const isSubmitPage = location.pathname === '/news/submit';
  
  // If on submit page, show submission component
  if (isSubmitPage) {
    return (
      <div className="min-h-screen bg-obsidian-950 pt-20">
        <ArticleSubmission />
      </div>
    );
  }

  const handleNewMeme = (meme: Partial<Meme>) => {
    const newMeme: Meme = {
      id: `m${Date.now()}`,
      title: meme.title || 'Untitled Meme',
      image: meme.image || '🔥',
      imageUrl: meme.imageUrl,
      author: 'You',
      authorPrincipal: '...',
      votes: 0,
      downvotes: 0,
      harleeRewards: BigInt(0),
      isSpicy: false,
      comments: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    setMemes([newMeme, ...memes]);
  };

  const handleNewArticle = (article: Partial<Article>) => {
    // Article submission handled by backend
    refreshArticles();
  };

  // Manual trigger for article generation
  const handleTriggerGeneration = async (persona: 'Raven' | 'Harlee' | 'Macho', topic?: string) => {
    if (!isAuthenticated || !identity) {
      setGenerationError('Please authenticate to generate articles');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      await newsService.triggerArticleGeneration(persona, topic);
      await refreshArticles();
      setGenerationError(null);
    } catch (error: any) {
      setGenerationError(error.message || 'Failed to generate article');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 sm:pt-20 md:pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 md:mb-16"
        >
          <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-6 md:mb-8">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-t from-news-indigo to-purple-600 rounded-3xl opacity-30 blur-xl"
            />
            <div className="relative w-full h-full bg-gradient-to-br from-raven-dark to-raven-charcoal rounded-3xl border border-news-indigo/30 flex items-center justify-center">
              <Newspaper className="w-12 h-12 md:w-16 md:h-16 text-news-indigo" />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-4">
            <span className="text-white">Raven</span>{' '}
            <span className="bg-gradient-to-r from-news-indigo to-purple-600 bg-clip-text text-transparent">
              News
            </span>
          </h1>
          <p className="text-lg md:text-xl text-silver-400 max-w-2xl mx-auto mb-4">
            Decentralized news and meme platform with $HARLEE token rewards
          </p>
          <p className="text-gold-400 text-sm">
            Powered by $HARLEE Token (Ledger: {HARLEE_TOKEN.ledger.slice(0, 10)}...)
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-12"
        >
          {[
            { label: 'Articles', value: articles.length.toString(), icon: Newspaper, color: 'text-news-indigo' },
            { label: 'Memes', value: memes.length.toString(), icon: Image, color: 'text-pink-400' },
            { label: 'Writers', value: new Set(articles.map(a => a.author)).size.toString(), icon: Users, color: 'text-emerald-400' },
            { label: 'Your Rewards', value: formatHarlee(totalRewards), icon: Award, color: 'text-amber-400' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-xl md:rounded-2xl p-4 md:p-6 text-center border border-news-indigo/20 hover:border-news-indigo/40 transition-all"
            >
              <stat.icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.color} mx-auto mb-2 md:mb-3`} />
              <p className="text-xl md:text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-[10px] md:text-sm text-silver-500">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Tabs & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex gap-2">
            {[
              { id: 'articles', label: 'Articles', icon: Newspaper },
              { id: 'memes', label: 'Memes', icon: Image },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm md:text-base ${
                  activeTab === tab.id
                    ? 'bg-news-indigo text-white'
                    : 'bg-raven-dark text-silver-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {activeTab === 'articles' ? (
              <>
                <Link
                  to="/halo"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-bold rounded-xl hover:from-purple-500 hover:to-indigo-600 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  HALO
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/news/submit"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl"
                  >
                    <PenTool className="w-4 h-4" />
                    Write Article
                  </Link>
                )}
                <button
                  onClick={() => setUseNewspaperLayout(!useNewspaperLayout)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl"
                >
                  <Newspaper className="w-4 h-4" />
                  {useNewspaperLayout ? 'Grid View' : 'Newspaper View'}
                </button>
                <div className="relative group">
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        setIsWalletModalOpen(true);
                        return;
                      }
                      handleTriggerGeneration('Raven');
                    }}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-news-indigo to-purple-600 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGenerating ? 'Generating...' : 'Generate Article'}
                  </button>
                  {generationError && (
                    <div className="absolute top-full left-0 mt-2 p-2 bg-red-500 text-white text-xs rounded z-50 whitespace-nowrap">
                      {generationError}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {isAuthenticated && (
                  <button
                    onClick={() => setShowMemeUpload(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl"
                  >
                    <Upload className="w-4 h-4" />
                    {t('news.uploadMeme')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'articles' && (
              <>
                {articlesLoading ? (
                  <div className="text-center py-16">
                    <Loader2 className="w-12 h-12 text-news-indigo animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">{t('common.loading')}</h3>
                    <p className="text-gray-400">{t('news.fetchingLatest')}</p>
                  </div>
                ) : articlesError ? (
                  <div className="text-center py-16">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">{t('news.errorLoading')}</h3>
                    <p className="text-gray-400 mb-4">{articlesError}</p>
                    <button
                      onClick={() => refreshArticles()}
                      className="px-6 py-3 bg-news-indigo text-white font-bold rounded-xl"
                    >
                      {t('common.retry')}
                    </button>
                  </div>
                ) : useNewspaperLayout ? (
                  <NewspaperLayout 
                    articles={articles.map(a => ({
                      id: Number(a.id),
                      title: a.title,
                      slug: a.slug || a.id.toString(),
                      excerpt: a.excerpt || a.content.substring(0, 200),
                      content: a.content,
                      author_persona: a.author || 'Raven',
                      published_at: BigInt(a.publishedAt),
                      category: a.category || 'news'
                    }))}
                    comics={[]}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {articles.map((article, i) => (
                      <ArticleCard 
                        key={article.id} 
                        article={article} 
                        featured={article.featured && i < 2}
                        onExpand={() => setSelectedArticle(article)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'memes' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {memes.map((meme) => (
                  <MemeCard 
                    key={meme.id} 
                    meme={meme}
                    onComment={() => {}}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Empty States */}
        {activeTab === 'articles' && !articlesLoading && articles.length === 0 && !articlesError && (
          <div className="text-center py-16">
            <Newspaper className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Articles Yet</h3>
            <p className="text-gray-400 mb-6">Generate your first AI-powered article to get started!</p>
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => handleTriggerGeneration('Raven')}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Newspaper className="w-5 h-5" />
                      Generate News Article (Raven)
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleTriggerGeneration('Harlee')}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate General Article (Harlee)
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleTriggerGeneration('Macho')}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5" />
                      Generate Health Article (Macho)
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 mb-4">Connect your wallet to generate articles</p>
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="px-6 py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            )}
            {generationError && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{generationError}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'memes' && memes.length === 0 && (
          <div className="text-center py-16">
            <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t('news.noMemes')}</h3>
            <p className="text-gray-400 mb-4">{t('news.uploadFirstMeme')}</p>
            {isAuthenticated && (
              <button
                onClick={() => setShowMemeUpload(true)}
                className="px-6 py-3 bg-pink-500 text-white font-bold rounded-xl"
              >
                {t('news.uploadMeme')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedArticle && (
          <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} refreshArticles={refreshArticles} />
        )}
        {showMemeUpload && (
          <MemeUploadModal onClose={() => setShowMemeUpload(false)} onSubmit={handleNewMeme} />
        )}
        {showArticleSubmit && (
          <ArticleSubmitModal onClose={() => setShowArticleSubmit(false)} onSubmit={handleNewArticle} />
        )}
      </AnimatePresence>

      {/* Wallet Connection Modal */}
      <WalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)} 
      />
    </div>
  );
}
