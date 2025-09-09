/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
  brand: {
    DEFAULT: "#1B79D9",
    50: "#EAF3FF",
    100: "#D5E7FF",
    200: "#A6CBFB",
    300: "#77AEF6",
    400: "#4A92F1",
    500: "#1B79D9",
    600: "#155FAF",
    700: "#0F4684",
    800: "#093059",
    900: "#041A2F"
  },
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
