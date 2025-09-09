/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F8FAFC",
        panel: "#FFFFFF",
        ink: "#111827",
        sub: "#64748B",
        brand: "#1B79D9",
        accent: "#0EA5E9"
      },
      boxShadow: {
        soft: "0 10px 24px rgba(2,6,23,.06)"
      },
      borderRadius: { xxl: "1.25rem" }
    },
  },
  plugins: [],
};
