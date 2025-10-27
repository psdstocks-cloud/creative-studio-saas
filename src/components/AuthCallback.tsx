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
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (isAuthenticated) {
            setStatus('verified');
            
            // Countdown timer
            const countdownInterval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Redirect after 5 seconds
            const redirectTimer = setTimeout(() => {
                navigate('/', { replace: true });
            }, 5000);

            return () => {
                clearInterval(countdownInterval);
                clearTimeout(redirectTimer);
            };
        }
    }, [isAuthenticated, navigate]);

    return (
        <div className="flex h-screen w-screen items-center justify-center gradient-bg text-white">
            <div className="max-w-md w-full mx-4">
                <div className="text-center p-10 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 animate-fadeIn">
                    {status === 'verifying' && (
                        <>
                            <ArrowPathIcon className="h-20 w-20 text-blue-400 animate-spin mx-auto mb-6" />
                            <h1 className="text-3xl font-bold mb-3">Verifying your email...</h1>
                            <p className="text-gray-200 text-lg">Please wait a moment.</p>
                        </>
                    )}
                    {status === 'verified' && (
                        <>
                            {/* Success Icon with Animation */}
                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-24 h-24 bg-green-400/20 rounded-full animate-ping"></div>
                                </div>
                                <CheckCircleIcon className="h-24 w-24 text-green-400 mx-auto relative animate-bounce" />
                            </div>
                            
                            {/* Title */}
                            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                                🎉 Email Verified!
                            </h1>
                            
                            {/* Message */}
                            <p className="text-gray-100 text-lg mb-6">
                                Your account has been successfully activated!
                            </p>
                            
                            {/* Welcome Message */}
                            <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4 mb-6">
                                <p className="text-green-100 font-medium">
                                    ✨ Welcome to Creative Studio SaaS!
                                </p>
                                <p className="text-green-200 text-sm mt-1">
                                    You have 100 free points to get started
                                </p>
                            </div>
                            
                            {/* Countdown */}
                            <div className="flex items-center justify-center space-x-2 text-gray-200">
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                <p className="text-base">
                                    Redirecting to dashboard in <span className="font-bold text-2xl text-white">{countdown}</span> seconds...
                                </p>
                            </div>
                            
                            {/* Manual Button */}
                            <button
                                onClick={() => navigate('/', { replace: true })}
                                className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
                            >
                                Go to Dashboard Now →
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthCallback;