import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowPathIcon, LockClosedIcon, CheckCircleIcon, XCircleIcon } from './icons/Icons';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        // Check if we have a valid session from the email link
        const checkSession = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                setIsValidToken(true);
            } else {
                setIsValidToken(false);
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validation
        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
            return;
        }

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Password updated successfully! Redirecting...' });
            
            // Redirect to home after 2 seconds
            setTimeout(() => {
                navigate('/', { replace: true });
            }, 2000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to reset password' });
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (isValidToken === null) {
        return (
            <div className="flex h-screen w-screen items-center justify-center gradient-bg">
                <div className="text-center">
                    <ArrowPathIcon className="h-16 w-16 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-white text-xl">Verifying reset link...</p>
                </div>
            </div>
        );
    }

    // Invalid token
    if (isValidToken === false) {
        return (
            <div className="flex h-screen w-screen items-center justify-center gradient-bg">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl text-center animate-fadeIn">
                        <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                            Invalid or Expired Link
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Go to Homepage
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Reset password form
    return (
        <div className="flex min-h-screen w-screen items-center justify-center gradient-bg py-12 px-4">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl animate-fadeIn">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                            <LockClosedIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                            Reset Password
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Enter your new password below
                        </p>
                    </div>

                    {/* Alert Message */}
                    {message && (
                        <div
                            className={`mb-6 p-4 rounded-lg border-l-4 ${
                                message.type === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300'
                            } animate-fadeIn`}
                            role="alert"
                        >
                            <div className="flex items-center">
                                {message.type === 'success' ? (
                                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                                ) : (
                                    <XCircleIcon className="w-5 h-5 mr-2" />
                                )}
                                <p className="font-medium">{message.text}</p>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* New Password */}
                        <div>
                            <label
                                htmlFor="new-password"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            >
                                New Password
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                                    <LockClosedIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    id="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full ps-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                                    required
                                    minLength={6}
                                    disabled={isLoading}
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Must be at least 6 characters
                            </p>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label
                                htmlFor="confirm-password"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            >
                                Confirm Password
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                                    <LockClosedIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    id="confirm-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full ps-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                                    required
                                    minLength={6}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            {isLoading && <ArrowPathIcon className="animate-spin -ms-1 me-3 h-5 w-5" />}
                            {isLoading ? 'Updating Password...' : 'Reset Password'}
                        </button>
                    </form>

                    {/* Back to Sign In */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => navigate('/')}
                            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500 font-medium transition-colors"
                        >
                            ← Back to Homepage
                        </button>
                    </div>
                </div>

                {/* Security Note */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-300 dark:text-gray-500">
                        🔒 Your password is encrypted and secure
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;

