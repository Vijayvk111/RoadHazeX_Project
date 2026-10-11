/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
            },
            colors: {
                municipal: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
                accent: {
                    gold: '#fbbf24',
                    crimson: '#e11d48',
                    emerald: '#10b981',
                }
            },
            backgroundImage: {
                'command-center': 'radial-gradient(circle at top, #1e293b 0%, #0f172a 100%)',
            }
        },
    },
    plugins: [],
}
