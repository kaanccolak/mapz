# Gidiyom — AI Destekli Seyahat Planlayıcı

## Teknoloji Stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Anthropic Claude API (claude-sonnet-4-5), max_tokens: 10000
- Google Maps JavaScript API (@vis.gl/react-google-maps)
- OpenTripMap API (limit=50, slice 40 mekan)
- jsPDF + html2canvas (PDF export)

## Önemli Dosyalar
- `app/page.tsx` — ana sayfa
- `app/plan/page.tsx` — plan sonuç sayfası
- `app/plans/page.tsx` — kullanıcı planları
- `app/plan/[shareId]/page.tsx` — paylaşılan plan
- `app/api/plan/route.ts` — API endpoint
- `lib/claude.ts` — Claude entegrasyonu
- `lib/opentripmap.ts` — mekan verileri
- `lib/destinations.ts` — şehir/ülke autocomplete
- `lib/departure-airports.ts` — kalkış havalimanları (51 havalimanı)
- `lib/firebase.ts` — Firebase init
- `lib/AuthContext.tsx` — auth state yönetimi
- `lib/planService.ts` — Firestore plan kaydet/oku/sil
- `lib/gezleLimits.ts` — sorgu limiti
- `components/HeroSearch.tsx` — ana form
- `components/MapView.tsx` — Google Maps harita
- `components/PdfExport.tsx` — PDF export
- `components/AccommodationPlan.tsx` — konaklama bölümü
- `components/Navbar.tsx` — navigasyon
- `components/AuthModal.tsx` — giriş/kayıt
- `components/ReservationModal.tsx` — rezervasyon bilgileri
- `components/PlanViewLayout.tsx` — plan görüntüleme layout

## Environment Variables (.env.local)
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `GOOGLE_MAPS_API_KEY` (server-side)
- `OPENTRIPMAP_API_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_APP_URL` (https://mapz-kappa.vercel.app)

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
- Firebase Authentication (Google + Email/Password girişi)
- Firestore ile plan kaydetme (`lib/planService.ts`)
- Planlarım sayfası (`app/plans/page.tsx`)
- Paylaşılabilir plan linki (`app/plan/[shareId]/page.tsx`) — salt okunur
- Navbar (`components/Navbar.tsx`) — logo, Planlarım, kullanıcı adı, Çıkış
- AuthModal (`components/AuthModal.tsx`) — giriş/kayıt modal
- ReservationModal (`components/ReservationModal.tsx`) — gidiş/dönüş uçuş + otel bilgileri, PDF'e yansıyor
- Sorgu limiti — localStorage ile cihaz başına max 2 plan (`lib/gezleLimits.ts`)
- Giriş yapmamış kullanıcılar max 4 gece plan yapabilir
- Grup detayları — Aile/Arkadaş grubu için kişi sayısı, çocuk yaşı, oda sayısı
- Booking.com linki kişi/oda/çocuk sayısına göre dinamik
- Skyscanner linki kişi/çocuk sayısına göre dinamik
- Gidiş Tarihi / Dönüş Tarihi label güncellendi
- Ana sayfa sadece form — extra section'lar kaldırıldı
- SEO meta tags (`app/layout.tsx`)
- `PlanViewLayout.tsx` — ortak plan görüntüleme komponenti

## Teknik Notlar
- React Strict Mode KAPALI (next.config.ts)
- useRef hasFetched ile çift fetch koruması
- OpenTripMap: rate=3, limit=50, slice(0,40), 500ms delay
- Places API KALDIRILDI (yavaş + güvenilir değil)
- Claude prompt: mekan tekrarı yok, kahvaltı her gün, köklü mekanlar tercih et
- Türkçe normalize: toLocaleLowerCase('tr-TR')
- Google Maps zoom: useMap + panTo, key prop yok

## Yapılacaklar
- ~~Vercel deploy~~ ✅
- ~~Kullanıcı girişi + plan kaydetme~~ ✅
- ~~Paylaşılabilir plan linki~~ ✅
- ~~SEO meta tags~~ ✅
- Domain alımı (gidiyom.net)
- Streaming ile süre optimizasyonu
- Para modeli (freemium)
- Mobil uygulama (Capacitor)
