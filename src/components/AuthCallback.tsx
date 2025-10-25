
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowPathIcon, CheckCircleIcon } from './icons/Icons';

const AuthCallback = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [status, setStatus] = useState<'verifying' | 'verified'>('verifying');

    useEffect(() => {
        if (isAuthenticated) {
            setStatus('verified');
            const timer = setTimeout(() => {
                navigate('/', { replace: true });
            }, 3000); // 3-second delay to show the message

            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className="flex h-screen w-screen items-center justify-center gradient-bg text-white">
            <div className="text-center p-8 bg-black/20 rounded-xl glassmorphism animate-fadeIn">
                {status === 'verifying' && (
                    <>
                        <ArrowPathIcon className="h-16 w-16 text-blue-400 animate-spin mx-auto mb-4" />
                        <h1 className="text-2xl font-bold">Verifying your email...</h1>
                        <p className="text-gray-300">Please wait a moment.</p>
                    </>
                )}
                {status === 'verified' && (
                    <>
                        <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold">{t('emailVerifiedTitle')}</h1>
                        <p className="text-gray-300">{t('emailVerifiedMessage')}</p>
                        <p className="text-sm text-gray-400 mt-4">{t('redirectingMessage')}</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthCallback;
