# Gidiyom — Yapay Zeka Destekli Seyahat Planlayıcı

> Nereye gittiğini söyle, gerisini biz halledelim.

## Özellikler

### Akıllı Plan Oluşturma

- Claude AI ile saniyeler içinde kişiselleştirilmiş günlük plan
- Bütçeye göre mekan önerileri
- Araç kiralama modunda çevre şehirlere günübirlik geziler
- Aile/çift/grup/yalnız seçeneğine göre kişiselleştirilmiş plan
- Uçuş saatlerine göre otomatik plan düzenleme
- Places API ile kapalı mekan doğrulaması

### Harita & Mekan Deneyimi

- Google Maps entegrasyonu — fotoğraflı Mindtrip tarzı pinler
- Pin'e tıklayınca mekan detayı: fotoğraf carousel, puan, yorumlar, açıklama, fiyat seviyesi, açık/kapalı durumu
- Aktivite silme/geri yükleme
- Manuel mekan ekleme (Google Maps linki ile)
- Manuel aktivite ekleme (serbest metin)

### Kaydet & Paylaş

- Firebase Authentication (Google + Email/Password)
- Planları kaydet, istediğin zaman geri dön
- Paylaşılabilir link — herkes görüntüleyebilir
- PDF olarak indir (Türkçe destekli)

### Rezervasyon & Harcama

- Rezervasyon bilgileri (uçuş PNR, otel rezervasyon no) PDF'e yansır
- Harcama planlayıcı — bütçeyle karşılaştırma
- Booking.com — kişi/çocuk/oda sayısına göre dinamik link
- Skyscanner — kişi/çocuk sayısına göre dinamik link

## Teknoloji Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Anthropic Claude API (claude-sonnet)
- Google Maps JavaScript API + Places API
- OpenTripMap API
- Firebase Authentication + Firestore
- Vercel deployment

## Kurulum

1. Repoyu klonla:

```bash
git clone https://github.com/kaanccolak/mapz.git
cd mapz
```

2. Bağımlılıkları yükle:

```bash
npm install
```

3. Environment variables oluştur:

```bash
cp .env.example .env.local
```

4. Geliştirme sunucusunu başlat:

```bash
npm run dev
```

## Environment Variables

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_API_KEY=
OPENTRIPMAP_API_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APP_URL=
```

## Google Cloud Console

Şu API'lerin aktif olması gerekiyor:

- Maps JavaScript API
- Places API
- Geocoding API

## Canlı Demo

https://mapz-kappa.vercel.app

## Lisans

MIT
