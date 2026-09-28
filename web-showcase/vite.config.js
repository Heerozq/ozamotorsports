import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        about: 'about-us.html',
        design: 'design-solutions.html',
        contact: 'contact.html',
        career: 'career.html',
        bobart: 'bobart.html',
        vodne1s: 'v-odne1s.html',
        ltb: 'ltb-valve-techno.html'
      }
    }
  }
});
