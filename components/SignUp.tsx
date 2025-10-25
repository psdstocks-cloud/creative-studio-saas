

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowPathIcon, EnvelopeIcon, LockClosedIcon, EnvelopeCheckIcon } from './icons/Icons';

interface SignUpProps {
    onSwitchToSignIn: () => void;
}

const SignUp = ({ onSwitchToSignIn }: SignUpProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { signUp } = useAuth();
    const { t } = useLanguage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            await signUp(email, password);
            setIsSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 animate-fadeIn text-center">
                <EnvelopeCheckIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('confirmationTitle')}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {t('confirmationMessage', { email: email })}
                </p>
                <button
                    onClick={onSwitchToSignIn}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {t('backToSignIn')}
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">{t('createYourAccount')}</h2>
            
            {error && (
                <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-6 rounded-md" role="alert">
                    <p>{error}</p>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email-signup" className="sr-only">{t('email')}</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                           <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="email"
                            id="email-signup"
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            placeholder={t('email')}
                            className="w-full ps-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="password-signup" className="sr-only">{t('password')}</label>
                     <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                           <LockClosedIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="password"
                            id="password-signup"
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            placeholder={t('password')}
                            className="w-full ps-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="confirm-password" className="sr-only">{t('confirmPassword')}</label>
                     <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                           <LockClosedIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="password"
                            id="confirm-password"
                            value={confirmPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                            placeholder={t('confirmPassword')}
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
                    {t('signUp')}
                </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                {t('alreadyHaveAccount')}{' '}
                <button onClick={onSwitchToSignIn} className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-500">
                    {t('signIn')}
                </button>
            </p>
        </div>
    );
};

export default SignUp;
