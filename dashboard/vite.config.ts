import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        // Marketing Pages
        main: resolve(__dirname, 'index.html'),
        pricing: resolve(__dirname, 'pricing.html'),
        features: resolve(__dirname, 'features.html'),
        howItWorks: resolve(__dirname, 'how-it-works.html'),
        signup: resolve(__dirname, 'signup.html'),
        book: resolve(__dirname, 'book.html'),
        terms: resolve(__dirname, 'terms.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        paymentSuccess: resolve(__dirname, 'payment-success.html'),
        // Trust & Info Pages
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
        security: resolve(__dirname, 'security.html'),
        compliance: resolve(__dirname, 'compliance.html'),
        faq: resolve(__dirname, 'faq.html'),
        demo: resolve(__dirname, 'demo.html'),
        markets: resolve(__dirname, 'markets.html'),
        setupGuide: resolve(__dirname, 'setup-guide.html'),
        
        // The React Dashboard Application
        app: resolve(__dirname, 'app/index.html')
      }
    }
  }
})
