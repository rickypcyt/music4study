import type { Config } from 'tailwindcss';

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@shadcn/ui/**/*.js", // Incluye shadcn/ui
  ],
  theme: {
    extend: {
      colors: {
        'study-purple': '#7C3AED', // Color branding
      }
    },
  },
  plugins: [],
} satisfies Config;