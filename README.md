# Gidiyom — Yapay Zeka Destekli Seyahat Planlayıcı

Türkçe arayüzlü, yapay zeka destekli seyahat planlama uygulaması. Destinasyon, tarih, bütçe ve tatil tercihlerini girerek dakikalar içinde gün gün plan üretin; haritada görün, PDF olarak paylaşın.

## Özellikler

- **Arama ve form:** Ülke/şehir autocomplete (Türkçe normalize), aramalı kalkış havalimanı seçimi, tarih ve saat seçicileri
- **Bütçe:** Formatlı bütçe alanı, bütçeye dahil kalemler (uçak, araç, konaklama, yeme-içme, aktiviteler), araç kiraladım anahtarı, uçak bileti var/yok akışı
- **Plan görünümü:** Masaüstünde sol sidebar + sağ harita; mobilde Plan/Harita sekmeli alt çubuk
- **Harita:** Google Maps; Mindtrip tarzı fotoğraflı pinler, mekan adı ve kategori ikonu etiketi; pin anchor koordinatla hizalı
- **Places:** Kapalı kalıcı mekan (`CLOSED_PERMANENTLY`) doğrulaması; pin detay paneli — foto carousel (3), puan, yorum sayısı, fiyat, adres, açık/kapalı, örnek yorumlar, editorial summary; server proxy ile CORS’suz istek; in-memory önbellek
- **Aktiviteler:** Tipe göre renkli pinler; silme ve geri yükleme
- **Konaklama:** Kompakt kartlar, kişi/oda/çocuğa göre dinamik Booking.com linki
- **Uçuş:** Kişi/çocuğa göre dinamik Skyscanner linki
- **Rezervasyon:** Gidiş/dönüş uçuş ve otel bilgileri modalı; PDF’e yansır
- **PDF:** Türkçe, gün gün bölümler; tahmini harcama özeti (jsPDF + html2canvas)
- **Harcama planlayıcı:** Uçak, konaklama, araç, yeme-içme, alışveriş, diğer
- **Uyarılar:** Mekan uyarısı bandı
- **Kimlik ve veri:** Firebase (Google + e-posta/şifre), Firestore ile plan kaydetme; Planlarım sayfası
- **Paylaşım:** Salt okunur paylaşılabilir plan linki
- **Navbar:** Logo, Planlarım, kullanıcı, çıkış; giriş/kayıt modalı
- **Limitler:** Cihaz başına plan sorgu limiti (localStorage); girişsiz kullanıcıda maksimum gece sınırı
- **Grup:** Aile/arkadaş için kişi sayısı, çocuk yaşı, oda sayısı
- **Diğer:** Yükleme animasyonu, SEO meta etiketleri, ortak plan layout bileşeni; ana sayfa odaklı form deneyimi

## Teknoloji Stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **Anthropic Claude API** — plan üretimi
- **Google Maps JavaScript API** + **Places API** (sunucu proxy route’ları ile)
- **OpenTripMap API** — mekan keşfi
- **Firebase Authentication** + **Firestore**
- **jsPDF** + **html2canvas** — PDF dışa aktarım
- **Vercel** — dağıtım

## Kurulum

1. Repoyu klonlayın.
2. Bağımlılıkları yükleyin: `npm install`
3. Proje kökünde `.env.local` oluşturup aşağıdaki değişkenleri tanımlayın.
4. Geliştirme sunucusu: `npm run dev` — uygulama [http://localhost:3000](http://localhost:3000) adresinde açılır.

Geliştirici notları ve dosya haritası için `CLAUDE.md` dosyasına bakın.

## Environment Variables

| Değişken | Açıklama |
|----------|----------|
| `ANTHROPIC_API_KEY` | Claude API anahtarı (plan üretimi). |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | İstemci tarafı harita ve Places proxy çağrıları. |
| `GOOGLE_MAPS_API_KEY` | Sunucu tarafı (Places doğrulama, proxy). |
| `OPENTRIPMAP_API_KEY` | OpenTripMap erişimi. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web yapılandırması. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase proje kimliği. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket (varsa). |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM gönderen kimliği. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase uygulama kimliği. |
| `NEXT_PUBLIC_APP_URL` | Üretim taban URL’si (paylaşım linkleri vb.). |

**Google Cloud:** Projede **Maps JavaScript API**, **Places API** ve **Geocoding API** etkin olmalıdır.

## Canlı Demo

[https://mapz-kappa.vercel.app](https://mapz-kappa.vercel.app)

## Lisans

MIT
