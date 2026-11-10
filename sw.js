// 1. Kesh versiyasi va nomi
// Agar kelajakda index.html ga katta o'zgarish kiritsangiz, 
// shu yerdagi 'v1' ni 'v2' ga o'zgartirsangiz, eski kesh tozalanadi.
const CACHE_NAME = 'essential-v1';

// 2. Keshlanishi kerak bo'lgan asosiy fayllar
// Bizning holatda bu faqat index.html, chunki ikonkalar Canvas orqali yaratiladi
const ASSETS_TO_CACHE = [
  './',
  './index.html'
];

// 3. Service Worker o'rnatilganda (install)
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Yangi Service Worker darhol ishga tushsin
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Kesh ochildi:', CACHE_NAME);
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
      console.warn('Keshga saqlashda xatolik (ehtimol fayl topilmadi):', err);
    })
  );
});

// 4. Service Worker faollashganda (activate)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Eski keshlarni o'chirish (agar versiya o'zgargan bo'lsa)
          if (cache !== CACHE_NAME) {
            console.log('Eski kesh o\'chirilmoqda:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Barcha ochiq sahifalarni nazorat qilish
});

// 5. Tarmoq so'rovlarini ushlab qolish (fetch)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Faqat GET so'rovlarini keshlaymiz
  if (request.method !== 'GET') return;

  const url = request.url;

  // MUHIM: Supabase bazasi va tashqi CDN (Excel uchun) so'rovlarini keshlash shart emas
  // Aks holda dastur eski ma'lumotlarni ko'rsatib qolishi mumkin
  if (url.includes('supabase.co') || url.includes('cdn.jsdelivr.net')) {
    return; 
  }

  // Qolgan barcha so'rovlar uchun "Cache First" (Avval keshdan qidir) strategiyasi
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Agar keshda bo'lsa, darhol qaytaramiz (tez ishlaydi)
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Agar keshda bo'lmasa, tarmoqdan yuklaymiz va keyingi safar uchun keshga saqlaymiz
      return fetch(request).then((networkResponse) => {
        // Faqat muvaffaqiyatli (200) javoblarni keshga saqlaymiz
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Agar internet bo'lmasa va keshda ham bo'lmasa, index.html ni ko'rsatamiz
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});