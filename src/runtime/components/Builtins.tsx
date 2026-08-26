import React, { useState } from 'react';

export interface TabsProps {
  children?: React.ReactNode;
  defaultIndex?: number;
  groupId?: string;
}

export interface TabItemProps {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ children, defaultIndex = 0 }) => {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<TabItemProps> => React.isValidElement(child)
  );

  if (items.length === 0) return null;

  return (
    <div className="dmd-tabs-wrapper">
      <div className="dmd-tabs-header" role="tablist">
        {items.map((item, idx) => (
          <button
            key={idx}
            role="tab"
            aria-selected={activeIndex === idx}
            className={`dmd-tab-btn ${activeIndex === idx ? 'active' : ''}`}
            onClick={() => setActiveIndex(idx)}
          >
            {item.props.icon && <span className="dmd-tab-icon">{item.props.icon}</span>}
            <span>{item.props.label || `Tab ${idx + 1}`}</span>
          </button>
        ))}
      </div>
      <div className="dmd-tab-panel" role="tabpanel">
        {items[activeIndex]?.props.children}
      </div>
    </div>
  );
};

export const Tab: React.FC<TabItemProps> = ({ children }) => {
  return <div className="dmd-tab-content">{children}</div>;
};

export interface CardProps {
  title: string;
  description?: string;
  href?: string;
  icon?: React.ReactNode | string;
  badge?: string;
  badgeType?: 'info' | 'success' | 'warning' | 'new';
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  href,
  icon,
  badge,
  badgeType = 'info',
  children,
}) => {
  const content = (
    <div className="dmd-card">
      <div className="dmd-card-header">
        {icon && (
          <div className="dmd-card-icon">
            {typeof icon === 'string' ? <span dangerouslySetInnerHTML={{ __html: icon }} /> : icon}
          </div>
        )}
        <div className="dmd-card-header-text">
          <h3 className="dmd-card-title">{title}</h3>
          {badge && <span className={`dmd-badge dmd-badge-${badgeType}`}>{badge}</span>}
        </div>
      </div>
      {description && <p className="dmd-card-desc">{description}</p>}
      {children && <div className="dmd-card-body">{children}</div>}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="dmd-card-link">
        {content}
      </a>
    );
  }

  return content;
};

export interface CardGridProps {
  cols?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}

export const CardGrid: React.FC<CardGridProps> = ({ cols = 2, children }) => {
  return <div className={`dmd-card-grid dmd-card-grid-${cols}`}>{children}</div>;
};

export interface BadgeProps {
  type?: 'info' | 'success' | 'warning' | 'danger' | 'new';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ type = 'info', children }) => {
  return <span className={`dmd-badge dmd-badge-${type}`}>{children}</span>;
};

export interface StepsProps {
  children: React.ReactNode;
}

export const Steps: React.FC<StepsProps> = ({ children }) => {
  return <div className="dmd-steps">{children}</div>;
};

export interface StepProps {
  title: string;
  step?: number;
  children: React.ReactNode;
}

export const Step: React.FC<StepProps> = ({ title, step, children }) => {
  return (
    <div className="dmd-step-item">
      <div className="dmd-step-marker">{step !== undefined ? step : ''}</div>
      <div className="dmd-step-content">
        <h4 className="dmd-step-title">{title}</h4>
        <div className="dmd-step-body">{children}</div>
      </div>
    </div>
  );
};
