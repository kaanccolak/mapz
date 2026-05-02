# Gezle — AI Destekli Seyahat Planlayıcı

## Teknoloji Stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Anthropic Claude API (claude-sonnet-4-5), max_tokens: 10000
- Google Maps JavaScript API (@vis.gl/react-google-maps)
- OpenTripMap API (limit=50, slice 40 mekan)
- jsPDF + html2canvas (PDF export)

## Önemli Dosyalar
- `app/page.tsx` — ana sayfa
- `app/plan/page.tsx` — plan sonuç sayfası
- `app/api/plan/route.ts` — API endpoint
- `lib/claude.ts` — Claude entegrasyonu
- `lib/opentripmap.ts` — mekan verileri
- `lib/destinations.ts` — şehir/ülke autocomplete
- `lib/departure-airports.ts` — kalkış havalimanları (51 havalimanı)
- `components/HeroSearch.tsx` — ana form
- `components/MapView.tsx` — Google Maps harita
- `components/PdfExport.tsx` — PDF export
- `components/AccommodationPlan.tsx` — konaklama bölümü

## Environment Variables (.env.local)
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `GOOGLE_MAPS_API_KEY` (server-side)
- `OPENTRIPMAP_API_KEY`

## Tamamlanan Özellikler
- Nereye? alanında ülke/şehir autocomplete (Türkçe normalize)
- Nereden kalkıyorsunuz? arama destekli havalimanı seçimi (51 havalimanı)
- Tarih seçici (date picker), saat seçici (time picker)
- Bütçe formatlı input (backspace handling, 1000 → 1.000 ₺)
- Bütçeye dahil kalemler toggle butonları (uçak, araç, konaklama, yeme-içme, aktiviteler)
- Araç kiraladım toggle switch
- Uçak bileti var/yok akışı
- Loading ekranı animasyonu
- Plan sayfası: sol sidebar + sağ harita (desktop)
- Mobil responsive: Plan/Harita tab bar (fixed bottom)
- Konaklama kartları kompakt, Booking.com linki
- Skyscanner uçuş linki
- Aktivite kartları: tip bazlı renkli pinler
- Aktivite silme/geri yükleme
- PDF export (Türkçe destekli, her gün ayrı section)
- Harcama Planlayıcı modal (uçak, konaklama, araç, yeme-içme, alışveriş, diğer)
- PDF'te Tahmini Harcama Özeti
- Mekan uyarısı bandı

## Teknik Notlar
- React Strict Mode KAPALI (next.config.ts)
- useRef hasFetched ile çift fetch koruması
- OpenTripMap: rate=3, limit=50, slice(0,40), 500ms delay
- Places API KALDIRILDI (yavaş + güvenilir değil)
- Claude prompt: mekan tekrarı yok, kahvaltı her gün, köklü mekanlar tercih et
- Türkçe normalize: toLocaleLowerCase('tr-TR')
- Google Maps zoom: useMap + panTo, key prop yok

## Yapılacaklar
- Vercel deploy
- Kullanıcı girişi + plan kaydetme
- Streaming ile süre optimizasyonu
