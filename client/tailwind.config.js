/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        system: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      colors: {
        health: {
          bg: "var(--health-canvas)",
          card: "var(--health-card)",
          elevated: "var(--health-elevated)",
          muted: "var(--health-muted)",
          label: "var(--health-label)",
          ring: "var(--health-pink)",
          ring2: "var(--health-green)",
          ring3: "#5ac8fa",
          track: "var(--health-track)",
          text: "var(--health-text)",
          border: "var(--health-separator)",
        },
      },
      borderRadius: {
        health: "20px",
      },
    },
  },
  plugins: [],
};