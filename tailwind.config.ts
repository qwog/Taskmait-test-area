import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { navy:'#1B2A4A', accent:'#0EA5E9', amber:'#F59E0B', danger:'#EF4444', success:'#10B981', bg:'#F8FAFC' } } },
  plugins: []
} satisfies Config;
