import React from 'react';
import { Calendar, BookOpen } from 'lucide-react';

interface NewspaperHeaderProps {
  edition?: number;
  date?: Date;
}

export const NewspaperHeader: React.FC<NewspaperHeaderProps> = ({ 
  edition = 1, 
  date = new Date() 
}) => {
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="newspaper-header">
      {/* Ornamental decorations */}
      <div className="header-ornament left">
        <div className="ornament-line" />
        <div className="ornament-dot" />
      </div>
      
      {/* Main Title */}
      <div className="newspaper-title-container">
        <h1 className="newspaper-title">
          <span className="title-the">The</span>
          <span className="title-raven">RAVEN</span>
          <span className="title-chronicle">Chronicle</span>
        </h1>
        
        {/* Tagline */}
        <p className="newspaper-tagline">
          "All the News That's Fit to Decentralize"
        </p>
      </div>
      
      <div className="header-ornament right">
        <div className="ornament-dot" />
        <div className="ornament-line" />
      </div>
      
      {/* Date and Edition Info */}
      <div className="newspaper-meta">
        <div className="meta-item">
          <Calendar className="meta-icon" size={16} />
          <span className="meta-text">{formatDate(date)}</span>
        </div>
        <div className="meta-divider">|</div>
        <div className="meta-item">
          <BookOpen className="meta-icon" size={16} />
          <span className="meta-text">Edition #{edition}</span>
        </div>
        <div className="meta-divider">|</div>
        <div className="meta-item">
          <span className="meta-text">Price: FREE (Decentralized)</span>
        </div>
      </div>
      
      {/* Decorative border */}
      <div className="header-border" />
    </div>
  );
};

