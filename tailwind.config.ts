import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    light: "#ff9b9b",
                    DEFAULT: "#FF6B6B",
                    dark: "#e65a5a",
                },
                secondary: {
                    light: "#79dfd9",
                    DEFAULT: "#4ECDC4",
                    dark: "#3cb3ab",
                },
                accent: {
                    light: "#fff0a3",
                    DEFAULT: "#FFE66D",
                    dark: "#ffd93d",
                },
                soft: "#F7FFF7",
                muted: "#2F2F2F",
            },
            borderRadius: {
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            boxShadow: {
                'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.1)',
                'vibrant': '0 4px 14px 0 rgba(255, 107, 107, 0.39)',
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            }
        },
    },
    plugins: [],
};
export default config;
