// Push notification handler for Service Worker

self.addEventListener("push", (event) => {
  let data = { title: "Atualização do pedido", body: "Seu pedido foi atualizado!" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      // Never allow empty title/body
      if (parsed.title) data.title = parsed.title;
      if (parsed.body) data.body = parsed.body;
      if (parsed.icon) data.icon = parsed.icon;
      if (parsed.data) data.data = parsed.data;
      if (parsed.tag) data.tag = parsed.tag;
      if (parsed.badge) data.badge = parsed.badge;
    }
  } catch (e) {
    // fallback to defaults
  }

  const options = {
    body: data.body,
    icon: data.icon || "/pwa-192x192.png",
    badge: data.badge || "/pwa-192x192.png",
    vibrate: [200, 100, 200],
    data: data.data || {},
    tag: data.data?.orderId ? `order-${data.data.orderId}` : (data.tag || "eprato-default"),
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
