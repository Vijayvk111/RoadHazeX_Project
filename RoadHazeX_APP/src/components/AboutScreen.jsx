import React from 'react';
import { Menu } from '@carbon/icons-react';
import { useLanguage } from '../contexts/LanguageContext';

const AboutScreen = ({ isActive, toggleSidebar }) => {
    const { t } = useLanguage();

    if (!isActive) return null;

    return (
        <div className="absolute inset-0 z-10 bg-[#020617] overflow-y-auto no-scrollbar animate-in fade-in duration-500">
            {/* Top Bar for Mobile Menu */}
            <div className="absolute top-4 left-4 z-[50]">
                <button
                    onClick={toggleSidebar}
                    className="p-3 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-800 text-white shadow-xl hover:bg-neutral-800 transition-all hover:scale-110"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Hero Banner Section */}
            <div className="relative w-full h-[350px] md:h-[450px] overflow-hidden bg-[#0a0f1c]">
                {/* Background gradient/glow overlay to blend edges */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617] z-10 pointer-events-none" />
                
                {/* Banner Image - Widespread */}
                <img 
                    src="/RoadHazeX_logo.png" 
                    alt="RoadHazeX Banner" 
                    className="absolute inset-0 w-full h-full object-cover object-center md:object-cover scale-105"
                />
            </div>

            {/* Content Section */}
            <div className="relative z-20 max-w-6xl mx-auto px-6 pb-24 -mt-10 md:-mt-20">
                {/* Centered Title */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400 tracking-tight uppercase shadow-sm">
                        {t('about.title')}
                    </h1>
                    <div className="w-24 h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 mx-auto mt-4 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                </div>

                {/* Main Description Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 mb-16 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <p className="text-neutral-300 text-lg md:text-xl leading-relaxed mb-6 font-medium text-justify md:text-center">
                        {t('about.desc1')}
                    </p>
                    <p className="text-neutral-400 text-base md:text-lg leading-relaxed text-justify md:text-center">
                        {t('about.desc2')}
                    </p>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card 1 */}
                    <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 hover:border-blue-500/50 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(59,130,246,0.15)] group">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <span className="text-2xl">🤖</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{t('about.f1Title')}</h3>
                        <p className="text-neutral-400 leading-relaxed">
                            {t('about.f1Desc')}
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 hover:border-green-500/50 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(34,197,94,0.15)] group">
                        <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <span className="text-2xl">🌍</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{t('about.f2Title')}</h3>
                        <p className="text-neutral-400 leading-relaxed">
                            {t('about.f2Desc')}
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 hover:border-orange-500/50 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(249,115,22,0.15)] group">
                        <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <span className="text-2xl">🗺️</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{t('about.f3Title')}</h3>
                        <p className="text-neutral-400 leading-relaxed">
                            {t('about.f3Desc')}
                        </p>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 hover:border-purple-500/50 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(168,85,247,0.15)] group">
                        <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <span className="text-2xl">📊</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{t('about.f4Title')}</h3>
                        <p className="text-neutral-400 leading-relaxed">
                            {t('about.f4Desc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutScreen;
