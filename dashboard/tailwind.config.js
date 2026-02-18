/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                luxe: {
                    obsidian: "#0D0D0D",
                    obsidian_light: "#1A1A1A",
                    gold: "#D4AF37",
                    gold_muted: "rgba(212, 175, 55, 0.1)",
                    white: "#F5F5F7",
                    glass: "rgba(255, 255, 255, 0.03)",
                },
                sa: {
                    midnight: "#0B1120",
                    navy: "#111827",
                    slate: "#1E293B",
                    platinum: "#E2E8F0",
                    muted: "#94A3B8",
                    accent: "#60A5FA",
                    'accent-glow': "rgba(96, 165, 250, 0.15)",
                    'accent-dark': "#3B82F6",
                    border: "rgba(148, 163, 184, 0.1)",
                }
            },
            fontFamily: {
                sans: ['Outfit', 'Inter', 'sans-serif'],
            },
            backgroundImage: {
                'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
            }
        },
    },
    plugins: [],
}
