/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        footer: "url('../public/wave.png')",
      },
      animation: {
        fill: "fill 2s ease-out 1 forwards",
        popup:
          "popup 0.5s ease-in-out 1 forwards, popupDelay 0.5s ease-in-out 4s 1 forwards",
      },
      keyframes: {
        fill: {
          "0%": { width: "0%", borderBottomRightRadius: "0rem" },
          "100%": { width: "100%", borderBottomRightRadius: "0.5rem" },
        },
        popup: {
          "0%": {
            bottom: "-100%",
          },
          "100%": {
            bottom: "1rem",
          },
        },
        popupDelay: {
          "0%": {
            bottom: "1rem",
          },
          "100%": {
            bottom: "-100%",
          },
        },
      },
    },
  },
  plugins: [],
};
