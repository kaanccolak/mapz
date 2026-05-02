# Gezle — AI Destekli Seyahat Planlayıcı

## Proje Özeti
Türk kullanıcılar için yapay zeka destekli seyahat planlama web uygulaması.

## Teknoloji Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Anthropic Claude API (claude-sonnet-4-5) — plan üretimi
- OpenTripMap API — gerçek mekan verileri ve koordinatlar
- Google Maps JavaScript API (@vis.gl/react-google-maps) — harita
- jsPDF + html2canvas — PDF export

## Önemli Dosyalar
- `app/page.tsx` — ana sayfa
- `app/plan/page.tsx` — plan sonuç sayfası
- `app/api/plan/route.ts` — plan üretim API endpoint'i
- `lib/claude.ts` — Claude API entegrasyonu
- `lib/opentripmap.ts` — OpenTripMap entegrasyonu
- `lib/destinations.ts` — şehir/ülke/havalimanı listesi (autocomplete)
- `lib/departure-airports.ts` — kalkış havalimanları listesi
- `components/HeroSearch.tsx` — ana arama formu
- `components/MapView.tsx` — Google Maps harita bileşeni
- `components/PdfExport.tsx` — PDF indirme bileşeni
- `components/AccommodationPlan.tsx` — konaklama planı bileşeni

## Environment Variables (.env.local)
- `ANTHROPIC_API_KEY` — Claude API key
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps key
- `OPENTRIPMAP_API_KEY` — OpenTripMap key

## Mevcut Özellikler
- Nereye? alanında ülke/şehir autocomplete (Türkçe normalize ile)
- Ülke seçilince şehir dropdown'u açılır (isteğe bağlı)
- Nereden kalkıyorsunuz? — arama destekli Türkiye havalimanları
- Varış havalimanı seçimi (uçak bileti varsa)
- Tarih seçici (date picker, geçmiş tarih engelli)
- Saat seçici (time picker)
- Bütçe formatlı input (1000 → 1.000 ₺)
- Bütçeye dahil kalemler seçimi (uçak, araç, konaklama, yeme-içme, aktivite)
- Araç kiraladım toggle'ı
- Uçak bileti var/yok akışı — varsa varış havalimanı + gidiş/dönüş saati
- OpenTripMap'ten gerçek mekan verileri (rate=3 filtresi)
- Claude ile gün gün dolu plan (4-5 aktivite + yemekler)
- Google Maps üzerinde numaralı renkli pinler (tip bazlı renk)
- Listedeki yere tıklayınca harita o konuma gider ve popup açılır
- Konaklama planı — şehir bazlı Booking.com yönlendirmesi
- Skyscanner uçuş arama entegrasyonu (doğru URL formatı)
- Aktivite silme/geri yükleme
- PDF indirme (jsPDF + html2canvas, Türkçe destekli)
- Loading ekranı animasyonu

## Teknik Notlar
- React Strict Mode KAPALI (`next.config.ts`) — çift API çağrısını önlemek için
- `useRef` ile çift fetch koruması (`hasFetched`)
- OpenTripMap istekleri sıralı + 500ms delay (rate limit önlemi)
- Claude max_tokens: 16000
- Türkçe normalize fonksiyonu: `toLocaleLowerCase('tr-TR')`

## Yapılacaklar
- Mobil responsive tasarım
- Streaming ile süre optimizasyonu
- Vercel deploy
