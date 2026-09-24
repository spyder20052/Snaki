// ===========================================================================
// SNAKI — SERVICE WORKER (notifications push)
// ===========================================================================
// Ce fichier tourne en arriere-plan, meme site ferme : c'est lui qui recoit
// les notifications et les affiche sur l'ecran du client.
//
// Il doit etre servi depuis la RACINE du domaine (/sw.js) : un service
// worker ne peut controler que les pages situees sous son propre chemin.

// Prend le controle immediatement, sans attendre la fermeture des onglets
// deja ouverts. Sans cela une nouvelle version resterait en attente.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

// --- RECEPTION -------------------------------------------------------------

self.addEventListener('push', event => {
  // Le message est chiffre par le serveur et dechiffre ici par le
  // navigateur. Si le corps est illisible, on affiche un texte de repli
  // plutot que rien du tout.
  let payload = { title: 'Snaki', body: 'Votre commande a été mise à jour.', url: '/' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    if (event.data) payload.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/boba.png',
      badge: '/favicon.svg',
      // `tag` par commande : une nouvelle notification REMPLACE la
      // precedente pour la meme commande, au lieu d'empiler « confirmée »,
      // « en préparation », « en route »... dans le centre de notifications.
      tag: payload.tag || 'snaki-order',
      renotify: true,
      // Vibration courte : le client doit sentir l'alerte sans etre agresse.
      vibrate: [120, 60, 120],
      data: { url: payload.url || '/' },
    }),
  )
})

// --- CLIC ------------------------------------------------------------------

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification.data?.url || '/'

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({
      type: 'window', includeUncontrolled: true,
    })
    // Si le site est deja ouvert, on y revient plutot que d'ouvrir un
    // second onglet.
    for (const client of clientList) {
      if (client.url.includes(self.location.origin)) {
        await client.focus()
        if ('navigate' in client) await client.navigate(target)
        return
      }
    }
    await self.clients.openWindow(target)
  })())
})

// --- REABONNEMENT ----------------------------------------------------------
// Les navigateurs peuvent renouveler un abonnement sans prevenir. Cet
// evenement permet de reenregistrer le nouvel endpoint pour ne pas perdre
// le canal.

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    const sub = event.newSubscription
      ?? await self.registration.pushManager.subscribe(event.oldSubscription.options)
    // La page rattachera cet abonnement au client a sa prochaine visite.
    const all = await self.clients.matchAll({ includeUncontrolled: true })
    for (const client of all) {
      client.postMessage({ type: 'push-resubscribed', subscription: sub.toJSON() })
    }
  })())
})
