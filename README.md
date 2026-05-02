# Gezle — AI destekli seyahat planlayıcı

## Proje özeti

Türk kullanıcılar için yapay zekâ destekli seyahat planlama web uygulaması. Kullanıcı destinasyon, tarihler ve tercihleri girer; **Claude** gün gün plan üretir; **OpenTripMap** gerçek mekan ve koordinat sağlar; **Google Maps** ile rota haritada gösterilir. Destinasyon araması **yerel bir liste** (`lib/destinations.ts`) ile yapılır; Photon kullanılmaz.

## Teknoloji stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Anthropic Claude API** (`claude-sonnet-4-5`) — plan üretimi
- **OpenTripMap API** — mekan listesi ve koordinatlar
- **Google Maps JavaScript API** (`@vis.gl/react-google-maps`) — harita ve numaralı pinler
- **Yerel destinations** (`lib/destinations.ts`) — şehir / ülke / varış havalimanı eşlemesi

## Önemli dosyalar

| Dosya | Açıklama |
|--------|-----------|
| `app/page.tsx` | Ana sayfa (hero + form yerleşimi) |
| `components/HeroSearch.tsx` | Plan formu; isteği `localStorage` (`planRequest`) yazar ve `/plan` yönlendirir |
| `app/plan/page.tsx` | `planRequest` ile API plan üretimi, yükleme ekranı, harita ve gün listesi |
| `app/api/plan/route.ts` | Plan üretim API endpoint’i |
| `lib/claude.ts` | Claude API, sistem prompt’u, kullanıcı mesajı, JSON parse |
| `lib/opentripmap.ts` | OpenTripMap entegrasyonu |
| `lib/destinations.ts` | Ülke/şehir gruplu arama ve havalimanı listeleri |
| `lib/iata.ts` | Skyscanner varış IATA ve uçuş linki |
| `components/MapView.tsx` | Google Maps, seçim senkronu, InfoWindow |
| `types/index.ts` | TypeScript tipleri (`PlanRequest`, `TripPlan`, …) |

## Ortam değişkenleri (`.env.local`)

Örnek: `.env.example`

| Değişken | Açıklama |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Claude API anahtarı |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps (istemci) anahtarı |
| `OPENTRIPMAP_API_KEY` | OpenTripMap anahtarı |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | İsteğe bağlı; Advanced Marker için. Yoksa demo Map ID kullanılır |

## Tasarım notları

- **Primary:** `#1d9e75`
- **Hero arka plan:** `#0a0a0f`
- **Font:** Next.js ile **Geist** (`next/font`)
- Genel arayüz sade; harita pinlerinde okunabilirlik için hafif gölge kullanılır

## Mevcut özellikler

- **Nereye?** — `lib/destinations.ts` ile ülke/şehir autocomplete; ülke seçilince isteğe bağlı şehir alt dropdown’u
- **Nereden kalkıyorsunuz?** — Türkiye kalkış havalimanları (IATA dropdown)
- **Varış havalimanı** — uçak bileti “var” seçildiğinde; seçilen destinasyona göre dolar
- **Uçak bileti var / yok** — varsa gidiş iniş ve dönüş kalkış saati; yoksa ilk/son gün saatsiz ve genel havalimanı ifadeleri + Skyscanner vurgusu
- OpenTripMap’ten çekilen mekanlarla Claude’a zengin bağlam
- Gün başına yoğun plan (ara günlerde çoklu aktivite + yemek molaları)
- Haritada tip renkli numaralı pinler; listeden seçimle haritaya odaklanma
- Şehir bazlı **Booking.com** arama URL’leri (`AccommodationPlan`)
- **Skyscanner** uçuş arama linki (`destinationAirportIata` ile varış IATA desteği)
- Aktivite silme / geri yükleme
- **React Strict Mode** kapalı ve plan sayfasında **useRef** ile çift fetch koruması (plan API’sinin tek çağrılması)

## Çalıştırma

```bash
cp .env.example .env.local
# .env.local içini doldurun

npm install
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) açın.

## Bilinen sorunlar / yapılacaklar

- `destinations.ts` listesi genişletilebilir (~60 destinasyon)
- Plan metni büyük ölçüde modele bağlıdır; kurallar prompt ve hafif sunucu tarafı normalizasyon ile desteklenir
- Daha önce kaydedilmiş `localStorage` planları, yeni normalizasyonları görmek için yeniden üretilmelidir
- Mobil responsive tasarım sınırlı
- Plan paylaşma özelliği yok
- Vercel / prod deploy dokümante edilmedi
- Plan üretimi süresi hâlâ uzun olabilir (ör. 25–40 sn); streaming ile iyileştirilebilir

Detaylı bağlam için bakınız: `CLAUDE.md`.
