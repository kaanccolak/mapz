# Gidiyom — AI Destekli Seyahat Planlayıcı

Türk kullanıcılar için yapay zeka destekli seyahat planlama uygulaması. Destinasyon, tarih, bütçe ve tatil tipini gir — Claude AI saniyeler içinde gün gün dolu bir plan oluşturur.

## Özellikler

- 🗺️ Gün gün dolu seyahat planı
- 📍 Google Maps üzerinde numaralı pinler
- 🏨 Booking.com otel önerileri
- ✈️ Skyscanner uçuş arama
- 💰 Harcama Planlayıcı
- 📄 PDF olarak indirme
- 📱 Mobil uyumlu

## Kurulum

```bash
npm install
npm run dev
```

Proje kökünde `.env.local` oluşturun:

```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
GOOGLE_MAPS_API_KEY=...
OPENTRIPMAP_API_KEY=...
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde açılır. Detaylı bağlam için `CLAUDE.md` dosyasına bakın.

## Teknolojiler

- Next.js 14, TypeScript, Tailwind CSS
- Anthropic Claude API
- Google Maps JavaScript API
- OpenTripMap API
- jsPDF + html2canvas
