export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#01696f"
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"]
      },
      boxShadow: {
        panel: "0 24px 70px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};
