import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import type { AuthView } from './Auth';
import AuthModal from './AuthModal';
import { SparklesIcon, ImageIcon, CodeBracketIcon } from './icons/Icons';
import { ThemeToggle } from './ThemeToggle';

interface AuthModalState {
  isOpen: boolean;
  initialView: AuthView;
}

const LandingPage = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [authModalState, setAuthModalState] = useState<AuthModalState>({
    isOpen: false,
    initialView: 'signIn',
  });

  const openModal = (view: AuthView) => {
    setAuthModalState({ isOpen: true, initialView: view });
  };

  const closeModal = () => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-900 text-theme-text-primary transition-colors duration-300">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 p-4">
        <div className="container mx-auto flex justify-between items-center p-4 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border border-gray-200 dark:border-slate-700 shadow-sm">
          <h1 className="text-2xl font-bold text-theme-text-primary transition-colors">
            Creative<span className="text-blue-500 dark:text-blue-400">SaaS</span>
          </h1>
          <div className="flex items-center gap-3 rtl:space-x-reverse">
            {/* Theme Toggle */}
            <ThemeToggle />

            <button
              onClick={() => openModal('signIn')}
              className="text-theme-text-secondary font-medium hover:text-blue-500 dark:hover:text-blue-300 transition-colors px-4 py-2"
            >
              {t('signIn')}
            </button>
            <button
              onClick={() => openModal('signUp')}
              className="bg-blue-600 dark:bg-blue-500 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl"
            >
              {t('signUp')}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-32 pb-16">
        {/* Hero Section */}
        <section className="text-center min-h-[60vh] flex flex-col items-center justify-center">
          <h1
            className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 animate-fadeIn"
            style={{ animationDelay: '0.2s' }}
          >
            Unleash Your Creative Vision
          </h1>
          <p
            className="max-w-3xl mx-auto text-lg md:text-xl text-theme-text-secondary mb-8 animate-fadeIn transition-colors"
            style={{ animationDelay: '0.4s' }}
          >
            The all-in-one platform for Egypt's creative professionals. Access millions of stock
            assets and generate breathtaking AI art with a single subscription.
          </p>
          <button
            onClick={() => openModal('signUp')}
            className="bg-blue-600 dark:bg-blue-500 text-white font-bold py-4 px-8 rounded-lg text-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all hover:scale-105 animate-fadeIn shadow-xl hover:shadow-2xl"
            style={{ animationDelay: '0.6s' }}
          >
            Get Started for Free
          </button>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-theme-text-primary transition-colors">
            A New Dimension of Creativity
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-center transition-all hover:scale-105 hover:shadow-xl shadow-sm">
              <div className="p-4 bg-blue-500/20 dark:bg-blue-400/20 rounded-xl inline-block mb-4 transition-colors">
                <ImageIcon className="w-10 h-10 text-blue-600 dark:text-blue-300 transition-colors" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-theme-text-primary transition-colors">
                Instant Stock Access
              </h3>
              <p className="text-theme-text-secondary transition-colors">
                Download premium photos, vectors, and videos from the world's top libraries without
                juggling subscriptions.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-center transition-all hover:scale-105 hover:shadow-xl shadow-sm">
              <div className="p-4 bg-purple-500/20 dark:bg-purple-400/20 rounded-xl inline-block mb-4 transition-colors">
                <SparklesIcon className="w-10 h-10 text-purple-600 dark:text-purple-300 transition-colors" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-theme-text-primary transition-colors">
                AI-Powered Imagination
              </h3>
              <p className="text-theme-text-secondary transition-colors">
                Turn your ideas into stunning, unique visuals. Our advanced AI generator brings your
                concepts to life in seconds.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-center transition-all hover:scale-105 hover:shadow-xl shadow-sm">
              <div className="p-4 bg-green-500/20 dark:bg-green-400/20 rounded-xl inline-block mb-4 transition-colors">
                <CodeBracketIcon className="w-10 h-10 text-green-600 dark:text-green-300 transition-colors" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-theme-text-primary transition-colors">
                Seamless API Integration
              </h3>
              <p className="text-theme-text-secondary transition-colors">
                Power your own applications with our robust, developer-friendly API for stock
                downloads and AI generation.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-slate-800 py-6 transition-colors border-t border-theme-border">
        <div className="container mx-auto text-center text-theme-text-secondary transition-colors">
          © {new Date().getFullYear()} CreativeSaaS. All Rights Reserved. Built for the modern
          creator.
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
