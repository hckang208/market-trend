/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        sub: "#475569",
        line: "#e5e7eb",
        accent: "#2563eb",
        bg: "#f8fafc"
      },
      boxShadow: {
        soft: "0 10px 25px -10px rgba(0,0,0,.08)",
      },
      borderRadius: {
        xl2: "1rem"
      }
    },
  },
  plugins: [],
};
