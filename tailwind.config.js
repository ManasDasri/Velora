/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        velora: {
          900: "#020617",
          800: "#0f172a",
          700: "#1e293b",
          400: "#38bdf8",
        },
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(56, 189, 248, 0.25), 0 0 20px rgba(56, 189, 248, 0.15)",
      },
    },
  },
  plugins: [],
};
