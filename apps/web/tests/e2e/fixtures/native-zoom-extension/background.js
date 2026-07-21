// Le pilotage est réalisé depuis le service worker par le script d'audit local.
// Aucun contenu, cookie ou identifiant de la page n'est enregistré par l'extension.
self.addEventListener('install', () => self.skipWaiting());
