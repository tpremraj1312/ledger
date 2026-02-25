/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fintech: {
          base: '#f8fafc', // slate-50
          card: 'rgba(255, 255, 255, 0.7)',
          border: 'rgba(0, 0, 0, 0.08)',
          primary: '#2563eb', // blue-600
          accent: '#7c3aed', // violet-600
          neon: '#3b82f6', // bright blue for highlights
        }
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 100%)',
        'glow-primary': 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, rgba(248,250,252,0) 70%)',
      }
    },
  },
  plugins: [],
}
