const CACHE_NAME = 'copilot-roi-v60';
const ASSETS = [
    './',
    './index.html',
    './demo.html',
    './roi-calculator.html',
    './Start Here.html',
    './changelog.html',
    './analytics.html',
    './run-locally.html',
    './styles.css',
    './script.js',
    './sales-script.js',
    './insights-shared.js',
    './insights-tabs.js',
    './header-mapping.js',
    './sample-data.csv',
    './viva-demo-data.csv',
    './lib/jspdf.umd.min.js',
    './lib/html2canvas.min.js',
    './lib/docx.umd.js',
    './lib/pptxgen.bundle.js',
    './lib/jszip.min.js',
    './lib/html2pdf.bundle.min.js',
    // Vendored typography — must be cached or the offline app falls back to system fonts.
    './assets/fonts/fonts.css',
    './assets/fonts/IBMPlexMono--F63fjptAgt5VM-kVkqdyU8n1i8q1w.woff2',
    './assets/fonts/IBMPlexMono--F63fjptAgt5VM-kVkqdyU8n1iAq129k.woff2',
    './assets/fonts/IBMPlexMono--F63fjptAgt5VM-kVkqdyU8n1iEq129k.woff2',
    './assets/fonts/IBMPlexMono--F63fjptAgt5VM-kVkqdyU8n1iIq129k.woff2',
    './assets/fonts/IBMPlexMono--F63fjptAgt5VM-kVkqdyU8n1isq129k.woff2',
    './assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3twJwl1FgtIU.woff2',
    './assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3twJwl5FgtIU.woff2',
    './assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3twJwl9FgtIU.woff2',
    './assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3twJwlBFgg.woff2',
    './assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3twJwlRFgtIU.woff2',
    './assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3vAOwl1FgtIU.woff2',
    './assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3vAOwl5FgtIU.woff2',
    './assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3vAOwl9FgtIU.woff2',
    './assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3vAOwlBFgg.woff2',
    './assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3vAOwlRFgtIU.woff2',
    './assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxaKYbABA.woff2',
    './assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxdKYbABA.woff2',
    './assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxeKYY.woff2',
    './assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxQKYbABA.woff2',
    './assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxRKYbABA.woff2',
    './assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxTKYbABA.woff2',
    './assets/fonts/Newsreader-cY9VfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBAbCJYQraA.woff2',
    './assets/fonts/Newsreader-cY9VfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBAbDJYQraA.woff2',
    './assets/fonts/Newsreader-cY9VfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBAbNJYQ.woff2'
];

// Install: pre-cache every asset
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

// Activate: remove old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch: cache-first. ignoreSearch lets versioned requests (styles.css?v=41)
// match the queryless cached entry; freshness comes from the CACHE_NAME bump.
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((cached) => cached || fetch(e.request))
    );
});
