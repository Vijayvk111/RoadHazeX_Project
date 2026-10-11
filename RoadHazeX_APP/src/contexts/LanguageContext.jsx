// src/contexts/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('roadhazex_lang') || 'en';
    });

    useEffect(() => {
        localStorage.setItem('roadhazex_lang', language);
    }, [language]);

    const t = (key) => {
        const keys = key.split('.');
        
        // Try requested language
        let val = translations[language];
        for (let k of keys) {
            val = val ? val[k] : undefined;
        }
        if (val) return val;
        
        // Fallback to English
        let fallback = translations['en'];
        for (let k of keys) {
            fallback = fallback ? fallback[k] : undefined;
        }
        
        return fallback || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
