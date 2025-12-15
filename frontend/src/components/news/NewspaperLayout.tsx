import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { NewspaperHeader } from './NewspaperHeader';
import { ComicsSection, Comic } from './ComicsSection';

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author_persona: string;
  published_at: number;
  category: string;
}

interface NewspaperLayoutProps {
  articles: Article[];
  comics?: Comic[];
  onUploadComic?: () => void;
  onComicLike?: (id: number | string) => void;
  onComicShare?: (id: number | string) => void;
}

export const NewspaperLayout: React.FC<NewspaperLayoutProps> = ({ 
  articles, 
  comics = [],
  onUploadComic,
  onComicLike,
  onComicShare
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [edition, setEdition] = useState(1);
  
  const articlesPerPage = 4;
  const hasComicsPage = comics.length > 0;
  const totalPages = Math.ceil(articles.length / articlesPerPage) + (hasComicsPage ? 1 : 0);
  
  // Calculate edition number (could be based on date or stored value)
  useEffect(() => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    setEdition(daysSinceStart + 1);
  }, []);

  const flipToPage = (direction: 'next' | 'prev') => {
    if (isFlipping) return;
    
    setIsFlipping(true);
    
    if (direction === 'next' && currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    } else if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
    
    setTimeout(() => setIsFlipping(false), 800);
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) / 1_000_000).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="newspaper-container">
      {/* Parchment Background */}
      <div className="parchment-bg" />
      
      {/* Newspaper Header */}
      <NewspaperHeader edition={edition} date={new Date()} />

      {/* Page Content */}
      <div className="newspaper-pages-wrapper">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ 
              rotateY: -90, 
              opacity: 0,
              scale: 0.95,
              z: -50
            }}
            animate={{ 
              rotateY: 0, 
              opacity: 1,
              scale: 1,
              z: 0
            }}
            exit={{ 
              rotateY: 90, 
              opacity: 0,
              scale: 0.95,
              z: -50
            }}
            transition={{ 
              duration: 0.6, 
              ease: [0.4, 0.0, 0.2, 1],
              opacity: { duration: 0.3 }
            }}
            style={{
              transformStyle: 'preserve-3d',
              perspective: '1000px'
            }}
            className="newspaper-page"
          >
            {currentPage === totalPages - 1 && hasComicsPage ? (
              <ComicsSection 
                comics={comics}
                onUploadClick={onUploadComic}
                onLike={onComicLike}
                onShare={onComicShare}
              />
            ) : (
              <ArticlesPage 
                articles={articles.slice(currentPage * articlesPerPage, (currentPage + 1) * articlesPerPage)} 
                pageNumber={currentPage + 1}
                formatDate={formatDate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Page Navigation */}
      <div className="newspaper-navigation">
        <button
          onClick={() => flipToPage('prev')}
          disabled={currentPage === 0 || isFlipping}
          className="nav-button prev"
        >
          <ChevronLeft size={24} />
          Previous Page
        </button>
        
        <div className="page-indicator">
          <BookOpen size={20} />
          Page {currentPage + 1} of {totalPages}
        </div>
        
        <button
          onClick={() => flipToPage('next')}
          disabled={currentPage === totalPages - 1 || isFlipping}
          className="nav-button next"
        >
          Next Page
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

// Articles Page Component
const ArticlesPage: React.FC<{ 
  articles: Article[]; 
  pageNumber: number;
  formatDate: (timestamp: number) => string;
}> = ({ articles, pageNumber, formatDate }) => {
  if (articles.length === 0) {
    return (
      <div className="articles-page empty">
        <p className="empty-message">No articles on this page.</p>
      </div>
    );
  }

  return (
    <div className="articles-page">
      {/* Lead Story (top) */}
      {articles[0] && (
        <article className="lead-story">
          <h2 className="headline lead-headline">{articles[0].title}</h2>
          <div className="byline">By {articles[0].author_persona} | {formatDate(articles[0].published_at)}</div>
          <div className="article-columns">
            <p className="lede">{articles[0].excerpt}</p>
            <div className="read-more-link">
              <a href={`/news/${articles[0].slug}`}>Continue reading →</a>
            </div>
          </div>
        </article>
      )}

      {/* Column Layout for remaining articles */}
      <div className="article-columns-grid">
        {articles.slice(1).map((article, idx) => (
          <article key={article.id} className={`column-article column-${idx + 1}`}>
            <h3 className="headline">{article.title}</h3>
            <div className="byline">By {article.author_persona}</div>
            <p className="excerpt">{article.excerpt.substring(0, 150)}...</p>
            <a href={`/news/${article.slug}`} className="read-more">Read More →</a>
          </article>
        ))}
      </div>

      {/* Page Number */}
      <div className="page-number">- {pageNumber} -</div>
    </div>
  );
};

// ComicsSection is now imported from separate file

