import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon } from './icons/Icons';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', duration = 3000, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const styles = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-blue-600 text-white',
    };

    const icons = {
        success: <CheckCircleIcon className="w-5 h-5" />,
        error: <XCircleIcon className="w-5 h-5" />,
        info: <CheckCircleIcon className="w-5 h-5" />,
    };

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${styles[type]}`}>
            {icons[type]}
            <span className="font-medium">{message}</span>
        </div>
    );
};

export default Toast;
