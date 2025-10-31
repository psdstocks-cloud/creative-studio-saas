import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { ImageIcon, SparklesIcon, CodeBracketIcon } from './icons/Icons';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const FeatureCard = ({ title, description, icon, onClick }: FeatureCardProps) => (
  <button
    onClick={onClick}
    className="p-6 text-left w-full transition-all duration-300 rounded-2xl glassmorphism hover:bg-gray-50 dark:hover:bg-white/10 hover:scale-105 border border-transparent hover:border-gray-200 dark:hover:border-white/20 shadow-sm hover:shadow-md"
  >
    <div className="p-3 rounded-lg bg-blue-500/20 dark:bg-blue-400/20 inline-block mb-4">{icon}</div>
    <div>
      <h3 className="text-lg font-semibold text-theme-text-primary">{title}</h3>
      <p className="text-sm text-theme-text-secondary mt-1">{description}</p>
    </div>
  </button>
);

const Home = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="animate-fadeIn space-y-12 h-full flex flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl lg:text-5xl font-bold text-theme-text-primary mb-2">{t('homeTitle')}</h1>
        <p className="text-lg text-theme-text-secondary max-w-2xl mx-auto">
          Welcome back, <span className="font-semibold text-blue-600 dark:text-blue-400">{user?.email}</span>!
        </p>
        <p className="text-base text-theme-text-tertiary max-w-2xl mx-auto mt-2">{t('homeSubtitle')}</p>
      </div>

      <section className="w-full max-w-5xl">
        <h2 className="text-xl font-semibold text-theme-text-primary mb-6 text-center">{t('quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title={t('aiGeneration')}
            description={t('aiImageGenerationDesc')}
            icon={<SparklesIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
            onClick={() => navigate('/app/ai')}
          />
          <FeatureCard
            title={t('stockFullSize')}
            description={t('stockDownloaderDesc')}
            icon={<ImageIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
            onClick={() => navigate('/app/stock')}
          />
          <FeatureCard
            title={t('api')}
            description={t('developerApiDesc')}
            icon={<CodeBracketIcon className="w-8 h-8 text-green-600 dark:text-green-400" />}
            onClick={() => navigate('/app/api')}
          />
        </div>
      </section>
    </div>
  );
};

export default Home;
