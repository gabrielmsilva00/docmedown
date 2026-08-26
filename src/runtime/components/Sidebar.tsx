import React, { useState } from 'react';
import { useDoc } from '../provider/DocProvider';
import { SidebarTreeNode } from '../types';

export const Sidebar: React.FC = () => {
  const { tree, currentSlug, navigate, isLoading, isMobileSidebarOpen, setIsMobileSidebarOpen } = useDoc();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div className="dmd-sidebar-backdrop" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      <aside className={`dmd-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`} aria-label="Documentation navigation">
        <div className="dmd-sidebar-label">Documentation</div>
        <nav className="dmd-sidebar-nav">
          <ul className="dmd-sidebar-list">
            {tree.length === 0 && isLoading && <li className="dmd-sidebar-status">Loading pages…</li>}
            {tree.map((node) => (
              <SidebarNode key={node.id} node={node} currentSlug={currentSlug} onNavigate={navigate} />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

interface SidebarNodeProps {
  node: SidebarTreeNode;
  currentSlug: string;
  onNavigate: (slug: string) => void;
}

const SidebarNode: React.FC<SidebarNodeProps> = ({ node, currentSlug, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(node.collapsed ?? false);

  if (node.isCategory) {
    return (
      <li className="dmd-sidebar-category">
        <button
          type="button"
          className="dmd-category-header"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
        >
          <span className="dmd-category-title">{node.title}</span>
          <svg
            className={`dmd-category-arrow ${collapsed ? 'collapsed' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {!collapsed && node.children && (
          <ul className="dmd-sidebar-sublist">
            {node.children.map((child) => (
              <SidebarNode key={child.id} node={child} currentSlug={currentSlug} onNavigate={onNavigate} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const isActive = currentSlug === node.slug || (currentSlug === 'README' && node.slug === 'README');

  return (
    <li className="dmd-sidebar-item">
      <a
        href={`#/${node.slug}`}
        className={`dmd-sidebar-link ${isActive ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          if (node.slug) onNavigate(node.slug);
        }}
      >
        {node.icon && <span className="dmd-item-icon">{node.icon}</span>}
        <span className="dmd-item-title">{node.title}</span>
        {node.badge && <span className={`dmd-badge dmd-badge-${node.badgeType || 'info'}`}>{node.badge}</span>}
      </a>
    </li>
  );
};
