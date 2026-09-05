import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'no.handleliste.app',
  appName: 'Handleliste',
  // Vite bygger til dist/, og hele appen pakkes inn i APK-en.
  // Ingen nettverkstilgang trengs for å kjøre den.
  webDir: 'dist',
  android: {
    // Lista er ren tekst og lokale data; ingen grunn til å tillate blandet innhold.
    allowMixedContent: false,
    backgroundColor: '#f6f7f4',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
