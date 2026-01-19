/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'nutanix-blue': '#22A5F7',
        'nutanix-dark': '#0B1C2C',
        'nutanix-light': '#F4F7F9',
        'nutanix-accent': '#0e2b46',
      },
    },
  },
  plugins: [],
}
