// Push notification handler for Service Worker
// This file is appended to the Workbox-generated SW

self.addEventListener("push", (event) => {
  let data = { title: "EPRATO", body: "Atualização do seu pedido" };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    // fallback to defaults
  }

  const options = {
    body: data.body,
    icon: data.icon || "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    vibrate: [200, 100, 200],
    data: data.data || {},
    tag: data.data?.orderId || data.tag || "eprato-default",
    renotify: true,
    actions: [{ action: "open", title: "Ver pedido" }],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
