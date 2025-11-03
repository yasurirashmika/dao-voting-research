import React from 'react';
import './Card.module.css';

const Card = ({
  children,
  title,
  subtitle,
  header,
  footer,
  padding = 'medium',
  hoverable = false,
  onClick,
  className = '',
  ...props
}) => {
  const cardClasses = [
    'card',
    `card-padding-${padding}`,
    hoverable ? 'card-hoverable' : '',
    onClick ? 'card-clickable' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} onClick={onClick} {...props}>
      {/* Custom Header */}
      {header && <div className="card-header-custom">{header}</div>}
      
      {/* Default Header with Title and Subtitle */}
      {(title || subtitle) && !header && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}

      {/* Body */}
      <div className="card-body">{children}</div>

      {/* Footer */}
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};

export default Card;