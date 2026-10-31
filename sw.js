/* JARVES AI V27 — cache do shell. APIs de IA nunca são armazenadas offline. */
'use strict';
const CACHE = 'jarves-v27-shell-1';
const SHELL = ['./','./index.html','./style.css','./script.js','./data/templates.js','./data/config.js','./data/v21.js','./data/v24.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('jarves-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const request=event.request, url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/v1/')) return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&( /\.(js|css|png|svg|webmanifest|html)$/.test(url.pathname)||url.pathname.endsWith('/'))){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  }).catch(async()=> (await caches.match(request))||(await caches.match('./index.html'))));
});
