// Service worker mínimo: permite instalar el cotizador como app desde Chrome.
// No guarda copias de la página, así siempre se abre la versión más reciente.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
