self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {}
  const title = payload.title || 'Trimio'
  const options = {
    body: payload.body || 'Tens uma nova atualização.',
    icon: '/branding/platform-logo.png',
    badge: '/branding/platform-logo.png',
    data: {
      url: payload.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = clientsList.find((client) => client.url === targetUrl)

    if (existing) {
      await existing.focus()
      return
    }

    await self.clients.openWindow(targetUrl)
  })())
})
