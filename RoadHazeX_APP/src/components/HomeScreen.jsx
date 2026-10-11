import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const HomeScreen = ({ isActive, toggleSidebar, navigateTo }) => {
    const { t } = useLanguage();
    if (!isActive) return null;

    // Split translation for buttons with <br /> if they contain newline
    const formatBtnLabel = (key) => {
        const text = t(key);
        return text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
                {line}
                {i < text.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    };

    return (
        <section
            className="absolute inset-0 flex flex-col justify-center items-center text-center bg-center bg-cover z-10 animate-fade-in"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?q=80&w=2662&auto=format&fit=crop')" }}
        >
            <div className="absolute inset-0 bg-blue-50/80 -z-10"></div>

            <div className="absolute top-4 left-4 z-50">
                <button
                    className="w-12 h-12 rounded-full bg-white/60 text-gray-800 backdrop-blur-md flex items-center justify-center shadow-sm hover:bg-white/80 transition-all active:scale-90"
                    onClick={toggleSidebar}
                    aria-label="Open Sidebar"
                >
                    <span className="material-icons-round text-2xl">menu</span>
                </button>
            </div>

            <div className="flex flex-col gap-10 items-center justify-center w-full animate-slide-up">
                <button
                    className="w-56 h-56 rounded-full bg-red-500 shadow-[0_10px_25px_rgba(239,68,68,0.4)] text-white font-bold text-3xl leading-tight flex flex-col items-center justify-center transform transition-transform active:scale-95 hover:scale-105"
                    onClick={() => navigateTo('report')}
                >
                    {formatBtnLabel('reportBtn')}
                </button>
                <button
                    className="w-56 h-56 rounded-full bg-green-500 shadow-[0_10px_25px_rgba(34,197,94,0.4)] text-white font-bold text-3xl leading-tight flex flex-col items-center justify-center transform transition-transform active:scale-95 hover:scale-105"
                    onClick={() => navigateTo('map')}
                >
                    {formatBtnLabel('mapBtn')}
                </button>
            </div>
        </section>
    );
};

export default HomeScreen;
