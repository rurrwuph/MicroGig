import React, { useState, useCallback } from 'react';
import { IconCheckCircle, IconXCircle, IconInfo, IconClose } from './Icons';

// Toast Context
export const ToastContext = React.createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev =>
      prev.map(t => t.id === id ? { ...t, removing: true } : t)
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error', dur),
    info:    (msg, dur) => addToast(msg, 'info', dur),
  };

  const icons = {
    success: <IconCheckCircle size={18} style={{ color: 'var(--clr-accent)' }} />,
    error:   <IconXCircle size={18} style={{ color: 'var(--clr-error)' }} />,
    info:    <IconInfo size={18} style={{ color: 'var(--clr-primary)' }} />,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} ${t.removing ? 'removing' : ''}`}>
            <span className="toast-icon">{icons[t.type]}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button className="toast-close" onClick={() => removeToast(t.id)} aria-label="Close">
              <IconClose size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => React.useContext(ToastContext);
