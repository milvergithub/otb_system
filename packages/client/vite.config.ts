import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png", "apple-touch-icon.png"],
      manifest: {
        name: "OTB Don Bosco",
        short_name: "OTB",
        description: "Sistema Agua - OTB Don Bosco",
        theme_color: "#0a5a3a",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          { src: "apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "index.html",
      },
      // Activa el SW en dev solo con VITE_PWA_DEV=true (para probar el install prompt).
      // En dev normal queda apagado para no interferir con el HMR ni cachear módulos.
      devOptions: { enabled: process.env.VITE_PWA_DEV === "true" },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["leaflet", "@geoman-io/leaflet-geoman-free"],
  },
  server: {
    port: 5173,
  },
})
