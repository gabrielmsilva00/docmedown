import React, { useEffect, useState } from 'react';
import { useDoc } from '../provider/DocProvider';
import { MarkdownRenderer } from '../markdown/renderer';

export const Content: React.FC = () => {
  const { currentDoc, currentSlug, isLoading, error, prevDoc, nextDoc, navigate, config } = useDoc();
  const [scrollProgress, setScrollProgress] = useState(0);

  // Track scroll progress for reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) {
        setScrollProgress(0);
        return;
      }
      const current = window.scrollY;
      setScrollProgress(Math.min(100, Math.max(0, (current / total) * 100)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Compute breadcrumbs from currentSlug
  const breadcrumbs = currentSlug.split('/').filter(Boolean);
  const progressLabel = Math.round(scrollProgress);

  // Compute edit URL
  let editUrl = config.editUrl;
  if (!editUrl && config.source?.repo && config.source.type === 'github') {
    const branch = config.source.branch || 'main';
    const docsDir = config.source.docsDir ? `${config.source.docsDir.replace(/^\/+|\/+$/g, '')}/` : '';
    editUrl = `https://github.com/${config.source.repo}/edit/${branch}/${docsDir}${currentSlug}.md`;
  }

  if (isLoading) {
    return (
      <main className="dmd-main-content">
        <div className="dmd-loading-skeleton">
          <div className="dmd-skeleton-title" />
          <div className="dmd-skeleton-line" />
          <div className="dmd-skeleton-line" />
          <div className="dmd-skeleton-line short" />
        </div>
      </main>
    );
  }

  if (error || !currentDoc) {
    return (
      <main className="dmd-main-content">
        <div className="dmd-error-container">
          <div className="dmd-error-code">!</div>
          <h2 className="dmd-error-title">{error || 'This page is unavailable.'}</h2>
          <p className="dmd-error-desc">Return to the overview, then choose another page from the documentation index.</p>
          <button className="dmd-btn-primary" onClick={() => navigate('README')}>
            Return to Overview
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* Reading progress bar */}
      <div className="dmd-progress-bar" style={{ width: `${scrollProgress}%` }} />

      <main className="dmd-main-content">
        {/* Breadcrumbs & Metadata Bar */}
        <div className="dmd-content-header">
          <nav className="dmd-breadcrumbs" aria-label="Breadcrumb">
            <span className="dmd-crumb" onClick={() => navigate('README')}>Docs</span>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className="dmd-crumb-sep">/</span>
                <span className={`dmd-crumb ${idx === breadcrumbs.length - 1 ? 'current' : ''}`}>
                  {crumb.replace(/[-_]/g, ' ')}
                </span>
              </React.Fragment>
            ))}
          </nav>

          <div className="dmd-content-meta" aria-label="Reading status">
            {currentDoc.readingTimeMinutes && (
              <span className="dmd-reading-time">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {currentDoc.readingTimeMinutes} min read
              </span>
            )}
            <span className="dmd-reading-progress" aria-label={`${progressLabel}% read`}>
              {progressLabel}% read
            </span>
          </div>
        </div>

        {/* Frontmatter tags */}
        {currentDoc.frontmatter.tags && (
          <div className="dmd-tags">
            {currentDoc.frontmatter.tags.map((tag: string, idx: number) => (
              <span key={idx} className="dmd-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Markdown Rendered Content */}
        <article className="dmd-article">
          <MarkdownRenderer html={currentDoc.html} onNavigate={navigate} />
        </article>

        {/* Edit on GitHub Link */}
        {editUrl && (
          <div className="dmd-edit-page-container">
            <a href={editUrl} target="_blank" rel="noopener noreferrer" className="dmd-edit-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              <span>Edit this page on GitHub</span>
            </a>
          </div>
        )}

        {/* Next / Prev Navigation Cards */}
        <div className="dmd-page-nav">
          {prevDoc ? (
            <div className="dmd-page-nav-card prev" onClick={() => navigate(prevDoc.slug)}>
              <span className="dmd-page-nav-sub">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Previous
              </span>
              <span className="dmd-page-nav-title">{prevDoc.title}</span>
            </div>
          ) : <div />}

          {nextDoc ? (
            <div className="dmd-page-nav-card next" onClick={() => navigate(nextDoc.slug)}>
              <span className="dmd-page-nav-sub">
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
              <span className="dmd-page-nav-title">{nextDoc.title}</span>
            </div>
          ) : <div />}
        </div>

        {/* Footer */}
        <footer className="dmd-footer">
          {config.footer?.copyright && <p className="dmd-footer-copy">{config.footer.copyright}</p>}
          {config.footer?.showBuiltWith !== false && (
            <p className="dmd-footer-builtwith">
              Documented with <a href="https://github.com" target="_blank" rel="noreferrer">DocMeDown</a> ⚡
            </p>
          )}
        </footer>
      </main>
    </>
  );
};
