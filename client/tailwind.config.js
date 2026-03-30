/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    preflight: false, // TEMPORARY GET RID LATER
  },
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

