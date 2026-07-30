/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        void: '#0a0a14',
        stage: '#12121f',
        wing: '#1a1a2e',
        flat: '#22223a',
        gold: '#e8c547',
        'gold-dim': '#b89c35',
        violet: '#a78bfa',
        'violet-dim': '#7c65c1',
        ash: '#e2e2e8',
        mist: '#8888aa',
        curtain: '#2d1b4e',
      },
    },
  },
  plugins: [],
}
