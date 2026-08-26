import React from 'react';
import { useDoc } from '../provider/DocProvider';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Content } from './Content';
import { TableOfContents } from './TableOfContents';
import { SearchModal } from '../search/SearchModal';

export const Layout: React.FC = () => {
  const { currentDoc, currentSlug, searchIndex, isSearchOpen, setIsSearchOpen, navigate, config } = useDoc();

  return (
    <div className="dmd-root">
      <Navbar />

      <div className="dmd-layout-body">
        <Sidebar />

        <div className="dmd-main-wrapper">
          <Content />
          {currentDoc && currentDoc.headings.length > 0 && (
            <TableOfContents headings={currentDoc.headings} currentSlug={currentSlug} />
          )}
        </div>
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchIndex={searchIndex}
        onSelect={(slug) => navigate(slug)}
        placeholder={config.search?.placeholder}
      />
    </div>
  );
};
