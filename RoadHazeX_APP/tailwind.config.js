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
                primary: '#FF6B6B',
                secondary: '#FF8E53',
                dark: '#1e3c72',
                light: '#2a5298',
                glass: {
                    100: 'rgba(255, 255, 255, 0.1)',
                    200: 'rgba(255, 255, 255, 0.2)',
                }
            },
            backgroundImage: {
                'primary-gradient': 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                'bg-gradient': 'linear-gradient(120deg, #1e3c72 0%, #2a5298 100%)',
            }
        },
    },
    plugins: [],
}
