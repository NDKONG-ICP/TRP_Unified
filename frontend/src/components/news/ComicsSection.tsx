import React from 'react';
import { Upload, Heart, Share2, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export interface Comic {
  id: number | string;
  title: string;
  imageUrl: string;
  caption: string;
  author?: string;
  likes?: number;
  comments?: number;
  publishedAt?: number;
}

interface ComicsSectionProps {
  comics: Comic[];
  onUploadClick?: () => void;
  onLike?: (id: number | string) => void;
  onShare?: (id: number | string) => void;
}

export const ComicsSection: React.FC<ComicsSectionProps> = ({
  comics,
  onUploadClick,
  onLike,
  onShare
}) => {
  return (
    <div className="comics-page">
      {/* Section Header */}
      <div className="section-header-container">
        <div className="section-header-line" />
        <h2 className="section-header">
          <span className="header-decoration">✦</span>
          THE FUNNY PAGES
          <span className="header-decoration">✦</span>
        </h2>
        <div className="section-header-line" />
      </div>
      
      {/* Comics Grid */}
      {comics.length > 0 ? (
        <div className="comics-grid">
          {comics.map((comic, index) => (
            <motion.div
              key={comic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="comic-panel"
            >
              {/* Comic Title */}
              <h4 className="comic-title">{comic.title}</h4>
              
              {/* Comic Image with Border */}
              <div className="comic-border">
                <img 
                  src={comic.imageUrl} 
                  alt={comic.caption || comic.title}
                  loading="lazy"
                />
              </div>
              
              {/* Caption */}
              <div className="comic-caption">{comic.caption}</div>
              
              {/* Author Credit */}
              {comic.author && (
                <div className="comic-author">
                  By {comic.author}
                </div>
              )}
              
              {/* Interaction Buttons */}
              <div className="comic-actions">
                <button
                  onClick={() => onLike?.(comic.id)}
                  className="comic-action-btn"
                  title="Like"
                >
                  <Heart size={16} />
                  <span>{comic.likes || 0}</span>
                </button>
                <button
                  onClick={() => onShare?.(comic.id)}
                  className="comic-action-btn"
                  title="Share"
                >
                  <Share2 size={16} />
                </button>
                <button
                  className="comic-action-btn"
                  title="Comment"
                >
                  <MessageCircle size={16} />
                  <span>{comic.comments || 0}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="comics-empty">
          <p className="empty-message">No comics yet. Be the first to submit one!</p>
        </div>
      )}

      {/* Upload Comic Section */}
      <div className="upload-comic-section">
        <button 
          onClick={onUploadClick}
          className="upload-comic-btn"
        >
          <Upload size={20} />
          Submit Your Comic
        </button>
        <p className="upload-hint">
          Share your memes and comics with the Raven News community
        </p>
      </div>
    </div>
  );
};

