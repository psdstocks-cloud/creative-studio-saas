

import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { AuthView } from './Auth';
import AuthModal from './AuthModal';
import { SparklesIcon, ImageIcon, CodeBracketIcon } from './icons/Icons';

interface AuthModalState {
    isOpen: boolean;
    initialView: AuthView;
}

const LandingPage = () => {
    const { t } = useLanguage();
    const [authModalState, setAuthModalState] = useState<AuthModalState>({ isOpen: false, initialView: 'signIn' });

    const openModal = (view: AuthView) => {
        setAuthModalState({ isOpen: true, initialView: view });
    };

    const closeModal = () => {
        setAuthModalState(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <div className="min-h-screen w-full text-white gradient-bg">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 p-4">
                <div className="container mx-auto flex justify-between items-center p-4 rounded-xl glassmorphism">
                    <h1 className="text-2xl font-bold text-white">Creative<span className="text-blue-400">SaaS</span></h1>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <button onClick={() => openModal('signIn')} className="text-white font-medium hover:text-blue-300 transition-colors px-4 py-2">{t('signIn')}</button>
                        <button onClick={() => openModal('signUp')} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 transition-colors">{t('signUp')}</button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 pt-32 pb-16">
                {/* Hero Section */}
                <section className="text-center min-h-[60vh] flex flex-col items-center justify-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                        Unleash Your Creative Vision
                    </h1>
                    <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-300 mb-8 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                        The all-in-one platform for Egypt's creative professionals. Access millions of stock assets and generate breathtaking AI art with a single subscription.
                    </p>
                    <button onClick={() => openModal('signUp')} className="bg-blue-600 text-white font-bold py-4 px-8 rounded-lg text-lg hover:bg-blue-700 transition-transform hover:scale-105 animate-fadeIn" style={{ animationDelay: '0.6s' }}>
                        Get Started for Free
                    </button>
                </section>

                {/* Features Section */}
                <section className="py-20">
                    <h2 className="text-3xl font-bold text-center mb-12">A New Dimension of Creativity</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-2xl glassmorphism text-center">
                            <div className="p-4 bg-white/10 rounded-xl inline-block mb-4">
                                <ImageIcon className="w-10 h-10 text-blue-300" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Instant Stock Access</h3>
                            <p className="text-gray-300">Download premium photos, vectors, and videos from the world's top libraries without juggling subscriptions.</p>
                        </div>
                        <div className="p-8 rounded-2xl glassmorphism text-center">
                            <div className="p-4 bg-white/10 rounded-xl inline-block mb-4">
                                <SparklesIcon className="w-10 h-10 text-blue-300" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">AI-Powered Imagination</h3>
                            <p className="text-gray-300">Turn your ideas into stunning, unique visuals. Our advanced AI generator brings your concepts to life in seconds.</p>
                        </div>
                        <div className="p-8 rounded-2xl glassmorphism text-center">
                            <div className="p-4 bg-white/10 rounded-xl inline-block mb-4">
                                <CodeBracketIcon className="w-10 h-10 text-blue-300" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Seamless API Integration</h3>
                            <p className="text-gray-300">Power your own applications with our robust, developer-friendly API for stock downloads and AI generation.</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-black/20 py-6">
                <div className="container mx-auto text-center text-gray-400">
                    © {new Date().getFullYear()} CreativeSaaS. All Rights Reserved. Built for the modern creator.
                </div>
            </footer>
            
            <AuthModal
                isOpen={authModalState.isOpen}
                initialView={authModalState.initialView}
                onClose={closeModal}
            />
        </div>
    );
};

export default LandingPage;