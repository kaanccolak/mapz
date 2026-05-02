# Gezle — AI Destekli Seyahat Planlayıcı

## Proje Özeti
Türk kullanıcılar için yapay zeka destekli seyahat planlama web uygulaması.

## Teknoloji Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Anthropic Claude API (claude-sonnet-4-5) — plan üretimi
- OpenTripMap API — gerçek mekan verileri ve koordinatlar
- Google Maps JavaScript API (@vis.gl/react-google-maps) — harita
- Photon API kaldırıldı, yerine yerel destinations listesi kullanılıyor

## Önemli Dosyalar
- `app/page.tsx` — ana sayfa
- `app/plan/page.tsx` — plan sonuç sayfası
- `app/api/plan/route.ts` — plan üretim API endpoint'i
- `lib/claude.ts` — Claude API entegrasyonu
- `lib/opentripmap.ts` — OpenTripMap entegrasyonu
- `lib/destinations.ts` — şehir/ülke/havalimanı listesi
- `components/HeroSearch.tsx` — ana arama formu
- `components/MapView.tsx` — Google Maps harita bileşeni

## Environment Variables (.env.local)
- `ANTHROPIC_API_KEY` — Claude API key
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Google Maps key
- `OPENTRIPMAP_API_KEY` — OpenTripMap key

## Mevcut Özellikler
- Nereye? alanında ülke/şehir autocomplete (lib/destinations.ts)
- Ülke seçilince şehir dropdown'u açılır (isteğe bağlı)
- Nereden kalkıyorsunuz? — Türkiye havalimanları dropdown
- Varış havalimanı seçimi (uçak bileti varsa)
- Uçak bileti var/yok akışı — varsa gidiş/dönüş saati sorulur
- OpenTripMap'ten gerçek mekan verileri
- Claude ile gün gün dolu plan (4-5 aktivite + yemekler)
- Google Maps üzerinde numaralı renkli pinler
- Listedeki yere tıklayınca harita o konuma gider
- Konaklama planı — şehir bazlı Booking.com yönlendirmesi
- Skyscanner uçuş arama entegrasyonu
- Aktivite silme/geri yükleme
- React Strict Mode kapalı (çift API çağrısını önlemek için)
- useRef ile çift fetch koruması

## Bilinen Sorunlar / Yapılacaklar
- destinations.ts listesi genişletilecek (şu an ~60 destinasyon)
- Mobil responsive tasarım eksik
- Plan paylaşma özelliği yok
- Vercel deploy yapılmadı
- Süre hâlâ uzun (25-40 sn) — streaming ile kısaltılabilir
