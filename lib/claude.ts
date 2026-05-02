import Anthropic from '@anthropic-ai/sdk';
import { tripNightsBetween } from '@/lib/opentripmap';
import type { HotelSuggestion, PlanRequest, TripPlan } from '@/types';
import { peopleToAdults } from '@/lib/iata';

const MODEL = 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `Sen Türkçe konuşan bir seyahat planlama asistanısın.
Kullanıcının verdiği bilgilere göre detaylı bir seyahat planı oluştur.

KURALLAR:
- Ara günler (ilk ve son gün dışındaki günler) için sabah 08:30'dan gece 22:00'a kadar saatlik plan yap; bu günlerde MUTLAKA 4-5 gezilecek/yapılacak aktivite olsun
- Kullanıcı mesajında uçuş iniş/kalkış saatleri veya "bilet yok" varsayımları varsa: ilk günü iniş ve transfer sonrasından başlat, son günü havalimanına en az 2 saat önce varışı gözeterek bitir; ilk ve son günde daha az aktivite olabilir ve bu normaldir
- Kullanıcı mesajında uçak bileti olmadığı açıkça belirtilmişse: kullanıcı mesajındaki ilk/son gün ve havalimanı adı yasağı kuralları, aşağıdaki günlük yemek zorunluluğundan önceliklidir; son gün yalnızca ayrılış/transfer ise o gün için kahvaltı/öğün sayısı zorunluluğunu uygulama
- Her gün 1 kahvaltı + 1 öğle yemeği + 1 akşam yemeği + 1 kafe molası olsun (uçak bileti yok ve son gün yalnızca transfer olan istisna hariç)
- Aktiviteler arası ulaşım için 15-20 dakika buffer ekle
- Gerçekçi süreler ver
- Restoran ve mekan isimleri gerçek ve o şehirde var olan yerler olsun
- Araç varsa çevre şehirlere günübirlik geziler ekle
- Bütçeye uygun öneriler yap
- Balayı/çift seyahatlerinde romantik dokunuşlar ekle

HARİTA:
- Her aktivite için "lat" ve "lng" (ondalık derece) ver.
- Her aktivitenin lat ve lng koordinatları kesinlikle doğru ve gerçek olmalı. Uydurma koordinat verme. Eğer bir mekanın koordinatını bilmiyorsan o şehrin merkez koordinatını ver. Koordinatlar Google Maps'te o mekanı göstermeli.
- Gün içinde aktivite sırası = rota sırası olacak şekilde listele.

KONAKLAMA (hotelSuggestions):
- hotelSuggestions içinde her şehir için mutlaka "bookingUrl" ver.
- bookingUrl formatı şöyle olsun (tek satır, tam URL):
  https://www.booking.com/searchresults.tr.html?ss=SEHIR_ADI%2C+ULKE_VEYA_BOLGE&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&group_adults=N
- ss değerinde şehir ve ülke/bölge virgülle ayrılmalı (URL'de %2C kullan). Örnek: Kotor için ss=Kotor%2C+Montenegro
- checkin/checkout: Kullanıcı mesajında verilen seyahat başlangıç ve bitiş tarihlerine (YYYY-MM-DD) göre her şehir için o şehirde kalınan ilk gece check-in, ayrılış günü check-out olacak şekilde hesapla.
- group_adults: kullanıcı mesajındaki N değerini kullan.
- Toplam gece sayısı ile start–end tarihleri uyumlu olsun; şehirler arası geceleri mantıklı böl (örnek: 7 gecede Kotor 3 gece, Budva 4 gece).
- Eski alan olarak "bookingSearchUrl" kullanma; yalnızca "bookingUrl" yeterli.

JSON yazımı (alan adları):
- Property name'lerde asla tek tırnak kullanma; yalnızca çift tırnaklı standart ASCII alan adları kullan (ör. "tripTitle", "days", "activities"). Property name'lerde Türkçe veya özel Unicode karakter kullanma. Mekan adları vb. için Türkçe ve özel karakterler yalnızca string değerlerinde olabilir.

Yanıtını SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma:
{
  "tripTitle": "...",
  "days": [
    {
      "dayNumber": 1,
      "date": "4 Eylül",
      "city": "Kotor",
      "title": "Varış & Kotor",
      "mapQuery": "Kotor Old Town Montenegro",
      "activities": [
        {
          "time": "09:30",
          "name": "...",
          "description": "...",
          "type": "gezi",
          "duration": "90 dakika",
          "lat": 42.4247,
          "lng": 18.7712
        }
      ]
    }
  ],
  "hotelSuggestions": [
    {
      "city": "Kotor",
      "nights": 3,
      "bookingUrl": "https://www.booking.com/searchresults.tr.html?ss=Kotor%2C+Montenegro&checkin=2026-09-04&checkout=2026-09-07&group_adults=2"
    }
  ],
  "budgetBreakdown": {
    "ucak": "~20.000 ₺",
    "konaklama": "~20.000 ₺",
    "aracKiralama": "~12.000 ₺",
    "yemeIcme": "~28.000 ₺",
    "gezmeAktivite": "~15.000 ₺",
    "alisveris": "~15.000 ₺"
  }
}`;

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY tanımlı değil');
  }
  return new Anthropic({ apiKey });
}

function extractText(message: Anthropic.Message): string {
  const parts = message.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');
  return parts.map((b) => b.text).join('');
}

/** Claude’a giden kullanıcı (user) mesajı — API route’ta log için export. */
export function buildUserMessage(req: PlanRequest, placesText: string): string {
  const peopleLabels: Record<PlanRequest['people'], string> = {
    yalniz: 'Yalnız',
    cift: 'Çift',
    aile: 'Aile',
    arkadasgrubu: 'Arkadaş grubu',
  };
  const tripLabels: Record<PlanRequest['tripType'], string> = {
    tarih: 'Tarih / kültür',
    deniz: 'Deniz',
    doga: 'Doğa',
    karma: 'Karma',
  };
  const adults = peopleToAdults(req.people);

  const otmBlock =
    placesText.trim().length > 0
      ? `
Aşağıda ${req.destination} için OpenTripMap'ten alınan gerçek mekanların listesi var.
Plan yaparken MUTLAKA bu listeden seç. Uydurma mekan ekleme.
Her aktivitenin lat ve lng değerlerini bu listeden al — koordinatlar %100 doğru olacak.

MEKAN LİSTESİ:
${placesText}
`
      : '';

  const flightBlock = req.hasTicket
    ? `
UÇUŞ BİLETİ: Var.
Gidiş uçağı iniş saati: ${req.arrivalTime ?? ''} (yerel saat)
Dönüş uçağı kalkış saati: ${req.departureTime ?? ''} (yerel saat)

ZORUNLU (genel günlük yoğunluk kurallarından önceliklidir):
- İlk gün planı uçak iniş saatinden itibaren başlasın; inişten önce aktivite koyma.
- Havalimanından otele transfer süresini hesaba kat (örnek: Podgorica havalimanı → Kotor ~1,5 saat, Podgorica → Budva ~1 saat). Destinasyon ve muhtemel varış havalimanına göre gerçekçi transfer süresi kullan.
- Son gün planı dönüş uçağı kalkış saatine göre ayarlansın: kalkıştan en az 2 saat önce havalimanında olunmalı; son aktiviteleri buna göre bitir.
- İlk ve son gün daha kısa aktivite listesi olabilir, bu normaldir.
`
    : `
Uçak bileti henüz alınmadı (dönüş saati bilinmiyor). Ara günler için standart yoğun tatil programı oluştur.

ZORUNLU — İçerik (ilk ve son gün):
- İlk gün (dayNumber: 1) ve son gün (seyahat bitiş tarihine denk gelen son gün): aktivite "name" ve "description" alanlarında hiçbir gerçek havaalanı adı kullanma (Tivat, Podgorica, İstanbul Havalimanı vb. yazma). "Havalimanı", "varış havalimanı", "bölgesel havalimanı" gibi genel ifadeler kullan.
- Son gün: "activities" dizisinde YALNIZCA TEK aktivite olsun — havalimanına transfer veya genel ayrılış hazırlığı. Başka gezi, yemek veya kafe aktivitesi ekleme. "description" içinde dönüş uçuğu henüz alınmadığı için saatlik program yapılamadığını ve yolcunun uçuş saatine göre günü kendisinin planlaması gerektiğini açıkça belirt.
- İlk gün: birkaç genel aktivite verebilirsin (varış, otele yerleşme, kısa şehir tanıtımı vb.) ama yine havaalanı özel adı kullanma.

ZORUNLU — JSON "time" alanı:
- İlk gün (dayNumber: 1) ve son gündeki HER aktivitede "time" tam olarak boş string "" olmalı.
- Sadece ara günlerde (ilk ve son arasındaki günler) "time" alanını doldur (örn. "09:30").
`;

  return `Lütfen aşağıdaki bilgilere göre seyahat planı oluştur:

Destinasyon: ${req.destination}
Kalkış havalimanı (IATA): ${req.departureIata}
Başlangıç tarihi (check-in referansı): ${req.startDate}
Bitiş tarihi (check-out referansı): ${req.endDate}
Kimlerle: ${peopleLabels[req.people]}
Tatil tipi: ${tripLabels[req.tripType]}
Bütçe (kullanıcının verdiği ifade): ${req.budget}
Araç kiralama: ${req.hasRentalCar ? 'Evet, araçlı' : 'Hayır, araçsız'}
group_adults (bookingUrl içinde kullan): ${adults}
${flightBlock}
${otmBlock}
JSON çıktısında gün sayısı, verilen tarih aralığına uygun olsun. hotelSuggestions içindeki her bookingUrl'de checkin/checkout tarihlerini bu başlangıç/bitişe ve şehir bazlı gece dağılımına göre üret.`;
}

function parseTripPlanJson(text: string): TripPlan {
  let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const jsonStart = clean.indexOf('{');
  const jsonEnd = clean.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
    clean = clean.substring(jsonStart, jsonEnd + 1);
  }

  let parsed: TripPlan;
  try {
    parsed = JSON.parse(clean) as TripPlan;
  } catch {
    console.error('JSON parse hatası, ham metin:', clean.substring(0, 500));
    throw new Error('JSON parse edilemedi');
  }

  if (!parsed.days || !Array.isArray(parsed.days)) {
    throw new Error('Geçersiz plan yanıtı');
  }
  if (parsed.hotelSuggestions?.length) {
    parsed.hotelSuggestions = parsed.hotelSuggestions.map((h: HotelSuggestion & { bookingSearchUrl?: string }) => {
      const bookingUrl = h.bookingUrl || h.bookingSearchUrl;
      return {
        city: h.city,
        nights: h.nights,
        bookingUrl,
        bookingSearchUrl: h.bookingSearchUrl,
      };
    });
  }
  return parsed;
}

/** Yerel isim + Havalimanı kalıplarını bilet yokken genel ifadeye çevirir (model uymazsa). */
function scrubSpecificAirportsInText(text: string): string {
  if (!text || !text.trim()) return text;
  let s = text;
  /** "Havalimanı", "Havalimanı'ndan", "Havalimanı'na" (ASCII ve ’) */
  const midAir = "(?:Uluslararası\\s+)?Havalimanı(?:'|\\u2019)?";
  const airports = [
    'Tivat',
    'Podgorica',
    'Dubrovnik',
    'Sarajevo',
    'Beograd',
    'Belgrad',
    'Zagreb',
    'İstanbul',
    'Istanbul',
    'Antalya',
    'Bodrum',
    'Dalaman',
    'İzmir',
    'Izmir',
    'Ankara',
    'Adana',
    'Trabzon',
    'Gazipaşa',
    'Gazipasa',
    'Kayseri',
    'Bursa',
    'Milas',
    'Eskişehir',
    'Eskisehir',
    'Frankfurt',
    'Münih',
    'Munich',
    'Vienna',
    'Viyana',
    'Lefkoşa',
    'Lefkosa',
    'Bükreş',
    'Bucharest',
    'Sofya',
    'Sofia',
    'Atina',
    'Athens',
  ];

  const escapeRe = (raw: string) => raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const raw of airports) {
    const a = escapeRe(raw);
    const pairs: [RegExp, string][] = [
      [new RegExp(`\\b${a}\\s*${midAir}ndan`, 'gi'), 'havalimanından'],
      [new RegExp(`\\b${a}\\s*${midAir}nden`, 'gi'), 'havalimanından'],
      [new RegExp(`\\b${a}\\s*${midAir}na`, 'gi'), 'havalimanına'],
      [new RegExp(`\\b${a}\\s*${midAir}ne`, 'gi'), 'havalimanına'],
      [new RegExp(`\\b${a}\\s*${midAir}ni`, 'gi'), 'havalimanına'],
      [new RegExp(`\\b${a}\\s*${midAir}\\b`, 'gi'), 'havalimanı'],
      [new RegExp(`\\b${a}\\s+Airport\\b`, 'gi'), 'havalimanı'],
    ];
    for (const [re, rep] of pairs) {
      s = s.replace(re, rep);
    }
  }

  const named = ['Adnan\\s+Menderes', 'Sabiha\\s+Gökçen', 'Sabiha\\s+Gokcen'];
  for (const pat of named) {
    const pairs: [RegExp, string][] = [
      [new RegExp(`\\b${pat}\\s*${midAir}ndan`, 'gi'), 'havalimanından'],
      [new RegExp(`\\b${pat}\\s*${midAir}na`, 'gi'), 'havalimanına'],
      [new RegExp(`\\b${pat}\\s*${midAir}\\b`, 'gi'), 'havalimanı'],
    ];
    for (const [re, rep] of pairs) {
      s = s.replace(re, rep);
    }
  }

  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

/** Bilet yokken: ilk/son gün saatlerini temizler, özel havaalanı adlarını name/description'dan siler. */
function sanitizeNoTicketFlightDays(plan: TripPlan, hasTicket: boolean): TripPlan {
  if (hasTicket || !plan.days?.length) return plan;
  const n = plan.days.length;
  const edge = new Set([0, n - 1]);
  return {
    ...plan,
    days: plan.days.map((day, idx) => {
      if (!edge.has(idx)) return day;
      return {
        ...day,
        activities: day.activities.map((a) => ({
          ...a,
          time: '',
          name: scrubSpecificAirportsInText(a.name),
          description: scrubSpecificAirportsInText(a.description),
        })),
      };
    }),
  };
}

/** Destinasyon ve gece sayısına göre kalınacak şehirleri İngilizce isimlerle döndürür (Claude). */
export async function resolveTripCities(request: PlanRequest): Promise<string[]> {
  const client = getAnthropicClient();
  const nights = tripNightsBetween(request.startDate, request.endDate);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    temperature: 0.2,
    system:
      'You reply with ONLY comma-separated English city names. No other words, no numbering, no explanation.',
    messages: [
      {
        role: 'user',
        content: `For a vacation to "${request.destination}" lasting ${nights} nights, which 2-3 cities should travelers stay in? Only city names in English, comma-separated. Example: Kotor, Budva`,
      },
    ],
  });

  const text = extractText(message).trim();
  const cities = text
    .split(',')
    .map((s) => s.replace(/^\d+[\.)]\s*/, '').trim())
    .filter(Boolean);

  const dedup: string[] = [];
  const seen = new Set<string>();
  for (const c of cities) {
    const k = c.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(c);
  }
  return dedup.slice(0, 5);
}

export async function generateTripPlan(request: PlanRequest, placesText: string): Promise<TripPlan> {
  const client = getAnthropicClient();
  const userContent = buildUserMessage(request, placesText);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    temperature: 0.5,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = extractText(message);
  if (!text) {
    throw new Error('Boş model yanıtı');
  }
  const plan = parseTripPlanJson(text);
  return sanitizeNoTicketFlightDays(plan, request.hasTicket);
}
