// /** @type {import('tailwindcss').Config} */
// export default {
//   content: [
//     "./index.html",
//     "./src/**/*.{js,ts,jsx,tsx}",
//   ],
//   theme: {
//     extend: {
//       fontFamily: {
//         mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
//         sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
//       },
//       colors: {
//         sentinel: {
//           50: '#f8fafc',
//           100: '#f1f5f9',
//           200: '#e2e8f0',
//           300: '#cbd5e1',
//           400: '#94a3b8',
//           500: '#64748b',
//           600: '#475569',
//           700: '#334155',
//           800: '#1e293b',
//           900: '#0f172a',
//         },
//         tier: {
//           approve: '#059669',     // Emerald 600
//           approveBg: '#ecfdf5',   // Emerald 50
//           approveBorder: '#a7f3d0',
//           review: '#d97706',      // Amber 600
//           reviewBg: '#fffbeb',    // Amber 50
//           reviewBorder: '#fde68a',
//           block: '#dc2626',       // Red 600
//           blockBg: '#fef2f2',     // Red 50
//           blockBorder: '#fecaca',
//         }
//       }
//     },
//   },
//   plugins: [],
// }

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Calm, light theme — not the generic purple-gradient AI look.
        canvas: '#F6FAFD',
        surface: '#FFFFFF',
        ink: {
          900: '#1B2733',
          700: '#3C4A58',
          500: '#66768A',
        },
        brand: {
          50: '#EAF3F8',
          200: '#B9D6E6',
          500: '#2F6690',   // signature slate-teal, replaces default purple
          700: '#1F4A6B',
        },
        status: {
          approve: '#0F9D58',
          approveBg: '#E6F6EC',
          review: '#B98900',
          reviewBg: '#FDF3D9',
          block: '#C0392B',
          blockBg: '#FCE8E6',
        },
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};