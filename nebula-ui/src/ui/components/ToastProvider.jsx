import React, { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    // ✅ CRITICAL FIX: Initialize global notification system (Singleton Pattern)
    useEffect(() => {
        window.showNotification = ({ type, title, message, duration = 3000, persistent = false }) => {
            const id = Date.now();
            const notification = { id, type, title, message, persistent };
            
            setNotifications(prev => [...prev, notification]);
            
            if (!persistent && duration > 0) {
                setTimeout(() => {
                    setNotifications(prev => prev.filter(n => n.id !== id));
                }, duration);
            }
        };
        
        return () => {
            // Don't nullify on unmount if multiple providers (though there shouldn't be)
            // But for safety in strict mode dev:
            // window.showNotification = null; 
        };
    }, []);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <ToastContext.Provider value={{ notifications, removeNotification }}>
            {children}
            <div className="notification-stack" style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                pointerEvents: 'none'
            }}>
                {notifications.map(notif => (
                    <div 
                        key={notif.id}
                        className={`notification notification-${notif.type}`}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: notif.type === 'success' ? 'rgba(76, 175, 80, 0.95)' :
                                       notif.type === 'error' ? 'rgba(244, 67, 54, 0.95)' :
                                       notif.type === 'warning' ? 'rgba(255, 152, 0, 0.95)' :
                                       'rgba(33, 150, 243, 0.95)',
                            color: '#fff',
                            minWidth: '300px',
                            maxWidth: '400px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                            animation: 'slideInRight 0.3s ease-out',
                            zIndex: 10000, // Ensure on top
                            pointerEvents: 'auto',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            gap: '10px'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    fontWeight: 600, 
                                    marginBottom: '4px',
                                    fontSize: '0.9rem'
                                }}>
                                    {notif.title}
                                </div>
                                {notif.message && (
                                    <div style={{ 
                                        fontSize: '0.85rem', 
                                        opacity: 0.9 
                                    }}>
                                        {notif.message}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => removeNotification(notif.id)}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    color: 'inherit',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
