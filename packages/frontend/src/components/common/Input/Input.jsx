import React from 'react';
import './Input.css';

const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  fullWidth = false,
  icon,
  multiline = false,
  rows = 4,
  className = '',
  ...props
}) => {
  const inputClasses = [
    'input-field',
    error ? 'input-error' : '',
    icon ? 'input-with-icon' : '',
    className
  ].filter(Boolean).join(' ');

  const wrapperClasses = [
    'input-wrapper',
    fullWidth ? 'input-full-width' : ''
  ].filter(Boolean).join(' ');

  const InputElement = multiline ? 'textarea' : 'input';

  return (
    <div className={wrapperClasses}>
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}

      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        
        <InputElement
          type={!multiline ? type : undefined}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={multiline ? rows : undefined}
          className={inputClasses}
          {...props}
        />
      </div>

      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && (
        <span className="input-helper-text">{helperText}</span>
      )}
    </div>
  );
};

export default Input;
