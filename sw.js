/* AI FIT 서비스워커: '공유' 로 들어온 이미지를 받는 일만 한다.
   캐시는 쓰지 않는다(예전 화면이 남는 문제를 피하려고). 다른 요청은 그대로 인터넷으로 보낸다. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'POST' || !/\/shorts\.html$/.test(url.pathname)) return;
  e.respondWith((async function () {
    var files = [];
    try {
      var fd = await req.formData();
      files = fd.getAll('image').filter(function (f) { return f && typeof f === 'object' && 'size' in f && f.size > 0; });
    } catch (err) { files = []; }
    var cache = await caches.open('fit-share');
    var old = await cache.keys();
    await Promise.all(old.map(function (k) { return cache.delete(k); }));
    await Promise.all(files.map(function (f, i) {
      return cache.put(new URL('shared/' + i, self.registration.scope).href, new Response(f, { headers: { 'Content-Type': f.type || 'image/jpeg' } }));
    }));
    return Response.redirect(new URL('shorts.html?shared=' + files.length, self.registration.scope).href, 303);
  })());
});
