/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b1020",
        panel: "#0f1730",
        ink: "#e5e7eb",
        sub: "#93a4c3",
        brand: "#6ee7ff",
        accent: "#a78bfa"
      },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,.25)" },
      borderRadius: { xxl: "1.25rem" }
    },
  },
  plugins: [],
};