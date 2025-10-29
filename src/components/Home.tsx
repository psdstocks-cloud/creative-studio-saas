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
        className="p-6 text-left w-full transition-all duration-300 rounded-2xl glassmorphism hover:bg-white/20 hover:scale-105"
    >
        <div className="p-3 rounded-lg bg-white/20 inline-block mb-4">
            {icon}
        </div>
        <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-300 mt-1">{description}</p>
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
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                    {t('homeTitle')}
                </h1>
                <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                   Welcome back, <span className="font-semibold text-blue-400">{user?.email}</span>!
                </p>
                 <p className="text-base text-gray-400 max-w-2xl mx-auto mt-2">{t('homeSubtitle')}</p>
            </div>
            
            <section className="w-full max-w-5xl">
                <h2 className="text-xl font-semibold text-white mb-6 text-center">{t('quickActions')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FeatureCard
                        title={t('aiGeneration')}
                        description={t('aiImageGenerationDesc')}
                        icon={<SparklesIcon className="w-8 h-8 text-white" />}
                        onClick={() => navigate('/app/ai')}
                    />
                    <FeatureCard
                        title={t('stockFullSize')}
                        description={t('stockDownloaderDesc')}
                        icon={<ImageIcon className="w-8 h-8 text-white" />}
                        onClick={() => navigate('/app/stock')}
                    />
                    <FeatureCard
                        title={t('api')}
                        description={t('developerApiDesc')}
                        icon={<CodeBracketIcon className="w-8 h-8 text-white" />}
                        onClick={() => navigate('/app/api')}
                    />
                </div>
            </section>
        </div>
    );
}

export default Home;
