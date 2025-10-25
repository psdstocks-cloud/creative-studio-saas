

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowPathIcon, EnvelopeIcon } from './icons/Icons';

interface ForgotPasswordProps {
    onSwitchToSignIn: () => void;
}

const ForgotPassword = ({ onSwitchToSignIn }: ForgotPasswordProps) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { sendPasswordResetEmail } = useAuth();
    const { t } = useLanguage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(email);
            setMessage(t('resetLinkSent'));
        } catch (err: any) {
            // To prevent email enumeration, we always show the same success-like message,
            // even if the backend were to throw an error (e.g., user not found).
            setMessage(t('resetLinkSent'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">{t('forgotPasswordTitle')}</h2>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">{t('forgotPasswordInstruction')}</p>

            {message ? (
                 <div className="bg-green-100 dark:bg-green-900/50 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 mb-6 rounded-md" role="alert">
                    <p>{message}</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email-forgot" className="sr-only">{t('email')}</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                id="email-forgot"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                placeholder={t('email')}
                                className="w-full ps-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading && <ArrowPathIcon className="animate-spin -ms-1 me-3 h-5 w-5" />}
                        {t('sendResetLink')}
                    </button>
                </form>
            )}

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                <button onClick={onSwitchToSignIn} className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-500">
                    {t('backToSignIn')}
                </button>
            </p>
        </div>
    );
};

export default ForgotPassword;
