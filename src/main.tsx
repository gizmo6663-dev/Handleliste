import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App } from './App.tsx';
import './styles.css';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Service worker gjør nettversjonen installerbar og tilgjengelig uten nett.
// I Android-appen ligger alle filene allerede lokalt i APK-en, og en service
// worker ville bare risikert å servere gammel kode etter en oppdatering.
if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // Uten service worker fungerer alt bortsett fra offline-bruk i nettleser.
      });
  });
}
