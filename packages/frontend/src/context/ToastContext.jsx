import React, { createContext, useContext, useState, useCallback } from 'react';
import Alert from '../components/common/Alert/Alert'; // Adjust path to your Alert component

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Remove toast by ID
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Add new toast
  const addToast = useCallback((type, title, message, duration = 5000) => {
    const id = Date.now().toString();
    const newToast = { id, type, title, message };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after 5 seconds
    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  // Helper functions
  const toast = {
    success: (msg, title = 'Success') => addToast('success', title, msg),
    error: (msg, title = 'Error') => addToast('error', title, msg),
    warning: (msg, title = 'Warning') => addToast('warning', title, msg),
    info: (msg, title = 'Info') => addToast('info', title, msg),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      
      {/* This Container Floats Over Your App */}
      <div className="toast-container">
        {toasts.map((t) => (
          <Alert
            key={t.id}
            type={t.type}
            title={t.title}
            onClose={() => removeToast(t.id)}
          >
            {t.message}
          </Alert>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};