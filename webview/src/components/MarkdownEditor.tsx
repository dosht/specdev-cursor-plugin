import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  enableMermaid?: boolean;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  onReview?: (status: 'approved' | 'rejected') => void;
  onRegenerate?: () => void;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  content, 
  onChange, 
  enableMermaid = false,
  reviewStatus = undefined,
  onReview,
  onRegenerate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  useEffect(() => {
    if (enableMermaid) {
      mermaid.initialize({ startOnLoad: true });
      mermaid.run();
    }
  }, [content, enableMermaid]);

  // Debounced auto-save
  useEffect(() => {
    if (isEditing) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        onChange(editContent);
      }, 800);
    }
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [editContent, isEditing, onChange]);

  const handleSave = () => {
    onChange(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const MermaidComponent = ({ children }: { children: string }) => {
    useEffect(() => {
      mermaid.run();
    });
    
    return <div className="mermaid">{children}</div>;
  };

  // Review checkpoint banner
  const renderReviewBanner = () => {
    if (!reviewStatus || isEditing) return null;
    if (reviewStatus === 'pending') {
      return (
        <div className="review-banner">
          <span>Review this document. Is it complete, clear, and correct?</span>
          <button onClick={() => onReview && onReview('approved')}>Y</button>
          <button onClick={() => onReview && onReview('rejected')}>N</button>
        </div>
      );
    }
    if (reviewStatus === 'rejected') {
      return (
        <div className="review-banner rejected">
          <span>Document rejected. Please edit and regenerate.</span>
          <button onClick={() => setIsEditing(true)}>Edit</button>
          {onRegenerate && <button onClick={onRegenerate}>Regenerate</button>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="markdown-editor">
      {renderReviewBanner()}
      <div className="editor-toolbar">
        {!isEditing ? (
          <button 
            className="edit-button"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        ) : (
          <div className="edit-controls">
            <button 
              className="save-button"
              onClick={handleSave}
            >
              Save
            </button>
            <button 
              className="cancel-button"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <div className="editor-content">
        {isEditing ? (
          <textarea
            className="markdown-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Enter markdown content..."
          />
        ) : (
          <div className="markdown-preview">
            <ReactMarkdown
              components={{
                code: ({ node, inline, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match && match[1];
                  
                  if (!inline && language === 'mermaid' && enableMermaid) {
                    return <MermaidComponent>{String(children).replace(/\n$/, '')}</MermaidComponent>;
                  }
                  
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;
