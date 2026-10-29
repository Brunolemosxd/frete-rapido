/* Os avisos de entrega nova foram retirados. Se algum celular ainda tiver
   este ajudante ligado, ele se desliga sozinho na próxima vez que o mural abrir. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.registration.unregister()));
