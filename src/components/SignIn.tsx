
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowPathIcon, EnvelopeIcon, LockClosedIcon } from './icons/Icons';

interface SignInProps {
    onSwitchToSignUp: () => void;
    onForgotPassword: () => void;
}

const SignIn = ({ onSwitchToSignUp, onForgotPassword }: SignInProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
    const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
    const { signIn, resendConfirmationEmail } = useAuth();
    const { t } = useLanguage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setEmailNotConfirmed(false);
        setResendStatus('idle');
        setIsLoading(true);
        try {
            await signIn(email, password);
            // On successful sign-in, the App component will handle the redirect.
        } catch (err: any) {
            if (err.message && err.message.toLowerCase().includes('email not confirmed')) {
                setEmailNotConfirmed(true);
            } else if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
                setError(t('signInFailedToFetch'));
            } else {
                setError(err.message || 'An unexpected error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setResendStatus('sending');
        setError(null);
        try {
            await resendConfirmationEmail(email);
            setResendStatus('sent');
        } catch(err: any) {
            setError(err.message);
            setResendStatus('idle');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">{t('signInToAccount')}</h2>
            
            {error && (
                <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-6 rounded-md" role="alert">
                    <p>{error}</p>
                </div>
            )}

            {emailNotConfirmed && (
                <div className="bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 p-4 mb-6 rounded-md" role="alert">
                    <p className="font-semibold">{t('emailNotConfirmed')}</p>
                    {resendStatus === 'sent' ? (
                        <p className="mt-2 font-medium text-green-700 dark:text-green-300">{t('confirmationResent')}</p>
                    ) : (
                        <button 
                            onClick={handleResend}
                            disabled={resendStatus === 'sending'}
                            className="mt-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-wait"
                        >
                            {resendStatus === 'sending' ? t('resending') : t('resendConfirmation')}
                        </button>
                    )}
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="sr-only">{t('email')}</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                           <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            placeholder={t('email')}
                            className="w-full ps-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="password-signin" className="sr-only">{t('password')}</label>
                     <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                           <LockClosedIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="password"
                            id="password-signin"
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            placeholder={t('password')}
                            className="w-full ps-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                     <div className="flex items-center justify-end mt-2 text-sm">
                        <button
                            type="button"
                            onClick={onForgotPassword}
                            className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-500"
                        >
                            {t('forgotPassword')}
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading && <ArrowPathIcon className="animate-spin -ms-1 me-3 h-5 w-5" />}
                    {t('signIn')}
                </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                {t('dontHaveAccount')}{' '}
                <button onClick={onSwitchToSignUp} className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-500">
                    {t('createAccount')}
                </button>
            </p>
        </div>
    );
};

export default SignIn;
