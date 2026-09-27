/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F2F4F7", // page
        surface: "#FFFFFF", // header, tooltips, inputs
        ink: "#15213B", // text and price history
        muted: "#5B6679", // secondary text, axes
        rule: "#D9DEE7", // hairlines and gridlines
        fan: "#3346D3", // the forecast
        up: "#17806A",
        down: "#C73E5A",
        flat: "#AEB6C4",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ['"Instrument Serif"', "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
