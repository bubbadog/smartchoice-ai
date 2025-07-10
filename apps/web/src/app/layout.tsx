import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SmartChoice AI',
  description: 'AI-powered shopping assistant that eliminates decision fatigue',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SmartChoice AI'
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover'
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'SmartChoice AI',
    'application-name': 'SmartChoice AI',
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
    'format-detection': 'telephone=no'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="background-color" content="#ffffff" />
        
        {/* iOS Specific */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SmartChoice AI" />
        
        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/splash/iphone5_splash.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/iphone6_splash.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/iphoneplus_splash.png" media="(device-width: 621px) and (device-height: 1104px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/iphonex_splash.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/iphonexr_splash.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/iphonexsmax_splash.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/ipad_splash.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/ipadpro1_splash.png" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/ipadpro2_splash.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/ipadpro3_splash.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                      
                      // Check for updates
                      registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // New version available
                              if (confirm('New version available! Reload to update?')) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                window.location.reload();
                              }
                            }
                          });
                        }
                      });
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
                
                // Listen for SW messages
                navigator.serviceWorker.addEventListener('message', event => {
                  const { type, data } = event.data;
                  
                  switch (type) {
                    case 'SYNC_COMPLETE':
                      console.log('Background sync completed:', data);
                      // Could show a toast notification here
                      break;
                    default:
                      console.log('SW message:', type, data);
                  }
                });
              }
              
              // Install prompt handling
              let deferredPrompt;
              
              window.addEventListener('beforeinstallprompt', (e) => {
                console.log('beforeinstallprompt fired');
                e.preventDefault();
                deferredPrompt = e;
                
                // Show custom install button
                const installBtn = document.querySelector('#install-btn');
                if (installBtn) {
                  installBtn.style.display = 'block';
                  installBtn.addEventListener('click', () => {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                      if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                      } else {
                        console.log('User dismissed the install prompt');
                      }
                      deferredPrompt = null;
                      installBtn.style.display = 'none';
                    });
                  });
                }
              });
              
              window.addEventListener('appinstalled', (evt) => {
                console.log('SmartChoice AI was installed');
                // Track installation
                if (typeof gtag !== 'undefined') {
                  gtag('event', 'pwa_install', {
                    'app_name': 'SmartChoice AI'
                  });
                }
              });
              
              // Handle offline/online events
              window.addEventListener('online', () => {
                console.log('Back online');
                // Could trigger background sync here
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.controller.postMessage({
                    type: 'TRIGGER_SYNC',
                    tag: 'search-sync'
                  });
                }
              });
              
              window.addEventListener('offline', () => {
                console.log('Gone offline');
                // Could show offline indicator
              });
            `
          }}
        />
        
        {/* Analytics */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Google Analytics 4
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'GA_MEASUREMENT_ID', {
                page_title: 'SmartChoice AI',
                custom_map: {'custom_parameter': 'custom_value'}
              });
            `
          }}
        />
      </head>
      
      <body>
        {children}
        
        {/* Install App Banner */}
        <div 
          id="install-banner" 
          style={{ 
            display: 'none',
            position: 'fixed',
            bottom: '1rem',
            left: '1rem',
            right: '1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '1rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 9999
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong>Install SmartChoice AI</strong>
              <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
                Get the full app experience on your device
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              <button 
                id="install-btn"
                style={{
                  backgroundColor: 'white',
                  color: '#3b82f6',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Install
              </button>
              <button 
                id="dismiss-install"
                style={{
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer'
                }}
                onClick="document.getElementById('install-banner').style.display = 'none'"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
