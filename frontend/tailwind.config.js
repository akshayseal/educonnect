/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f7f6f3',
          100: '#eeecea',
          200: '#d5d2cc',
          400: '#9b9790',
          600: '#5c5853',
          800: '#2c2a27',
          900: '#1a1917',
        },
        sky: {
          50: '#eef6fd',
          100: '#c8e3f8',
          400: '#4da6f0',
          600: '#185FA5',
          800: '#0c3d6e',
        },
        jade: {
          50: '#eaf5ee',
          400: '#2aa653',
          600: '#1a7a3c',
        },
        ember: {
          50: '#fff0eb',
          400: '#f0672a',
          600: '#c44a16',
        },
        crimson: {
          50: '#fdecea',
          400: '#e84040',
          600: '#b82020',
        },
      },
    },
  },
  plugins: [],
};
