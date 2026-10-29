/* Frete Rápido: só mostra as notificações de entrega nova.
   Não guarda nada em cache (sem "fetch"), para o site nunca ficar com versão velha. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const alvo = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    for (const c of lista) { if ('focus' in c) { c.postMessage({ abrir: e.notification.data && e.notification.data.id }); return c.focus(); } }
    return self.clients.openWindow(alvo);
  }));
});
