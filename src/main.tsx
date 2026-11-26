import {StrictMode, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function HostedDemoNotice() {
  const [visible,setVisible]=useState(true);
  if(!import.meta.env.VITE_HOSTED_DEMO || !visible)return null;
  return <aside aria-label="Hosted demo notice" role="status" className="fixed bottom-3 right-3 left-3 sm:left-auto sm:max-w-sm z-[100] rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 shadow-lg">
    <strong>Demo preview</strong>
    <p>Shared online bookings, result verification and payments await the hosted backend. Use synthetic records only.</p>
    <button className="mt-2 font-bold underline" onClick={()=>setVisible(false)}>Continue demo</button>
  </aside>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <HostedDemoNotice />
  </StrictMode>,
);

// Service Worker Registration: unregister in dev mode to prevent stale chunk caching
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In development mode, aggressively clear service workers and caches so Vite bundles remain fresh
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const reg of registrations) {
        reg.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then(names => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => {
          console.log('[PWA] Service Worker registration successful:', reg.scope);

          // Check for updates on register
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] New version detected! Reloading page to apply updates.');
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch(err => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    });
  }
}

