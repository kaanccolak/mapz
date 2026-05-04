import Anthropic from '@anthropic-ai/sdk';
import { assignBookingUrlsToHotelSuggestions } from '@/lib/booking';
import { tripNightsBetween } from '@/lib/opentripmap';
import {
  mergeBudgetIncludes,
  type Activity,
  type ActivityType,
  type HotelSuggestion,
  type PlanRequest,
  type TripPlan,
} from '@/types';
import { adultsFromRequest } from '@/lib/iata';

const MODEL = 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `Sen bir JSON üreticisin. Yanıtın her zaman sadece geçerli bir JSON objesi olmalı. { ile başla } ile bitir. Asla açıklama yazma. Aktivite açıklamaları maksimum 10 kelime olsun.

Yanıtın kısa ve öz olsun. Her aktivite için description maksimum 1 cümle olsun. Gereksiz detay yazma.

Sen Türkçe konuşan bir seyahat planlama asistanısın.
Kullanıcının verdiği bilgilere göre detaylı bir seyahat planı oluştur.

KURALLAR:
- Ara günler (ilk ve son gün dışındaki günler) için sabah 08:30'dan gece 22:00'a kadar saatlik plan yap; bu günlerde MUTLAKA 4-5 gezilecek/yapılacak aktivite olsun
- Kullanıcı mesajında uçuş iniş/kalkış saatleri veya "bilet yok" varsayımları varsa: ilk günü iniş ve transfer sonrasından başlat, son günü havalimanına en az 2 saat önce varışı gözeterek bitir; ilk ve son günde daha az aktivite olabilir ve bu normaldir
- Kullanıcı mesajında uçak bileti olmadığı açıkça belirtilmişse: kullanıcı mesajındaki ilk/son gün ve havalimanı adı yasağı kuralları, aşağıdaki günlük yemek zorunluluğundan önceliklidir; son gün yalnızca ayrılış/transfer ise o gün için kahvaltı/öğün sayısı zorunluluğunu uygulama
- Her gün 1 kahvaltı + 1 öğle yemeği + 1 akşam yemeği + 1 kafe molası olsun (uçak bileti yok ve son gün yalnızca transfer olan istisna hariç)
KAHVALTI:
- Her gün mutlaka kahvaltı aktivitesi olsun. "Otelde kahvaltı" YAZMA.
- Kahvaltı için OpenTripMap listesindeki kafeler veya restoranlardan seç, yoksa o bölgede gerçekten var olan bir kafe/restoran öner.
- Her gün 08:00-09:30 arasında kahvaltı aktivitesi olsun.
- Gün asla 10:00'dan önce bir aktivite olmadan başlamasın.

- Aktiviteler arası ulaşım için 15-20 dakika buffer ekle
- Gerçekçi süreler ver
- Restoran ve mekan isimleri gerçek ve o şehirde var olan yerler olsun
- Araç varsa çevre şehirlere günübirlik geziler ekle
- Bütçeye uygun öneriler yap
- Balayı/çift seyahatlerinde romantik dokunuşlar ekle

ÖNEMLİ KURALLAR:
- Aynı mekanı birden fazla günde ASLA tekrarlama
- Tüm plan boyunca her mekan sadece bir kez kullanılsın
- Kahvaltı, öğle, akşam için her gün FARKLI mekanlar seç
- Köklü, uzun süredir faaliyet gösteren turistik mekanları tercih et
- OpenTripMap listesinde yeterli mekan yoksa kendi bilginden gerçek mekan ekleyebilirsin; yine de hiçbir mekanı tekrarlama

BÜTÇE DAĞILIMI (budgetBreakdown):
- Kullanıcı mesajında "bu bütçeye dahil olanlar" listelenir. Yalnızca dahil edilen kalemler için anlamlı tutar tahmini yaz.
- Dahil OLMAYAN kalem için ilgili alanı boş string "" bırak (ör. uçak dahil değilse "ucak": "").
- Örn. uçak bileti dahil değilse ucak satırını gösterme anlamında değer verme; boş string kullan.

HARİTA:
- Her aktivite için "lat" ve "lng" (ondalık derece) ver.
- Her aktivitenin lat ve lng koordinatları kesinlikle doğru ve gerçek olmalı. Uydurma koordinat verme. Eğer bir mekanın koordinatını bilmiyorsan o şehrin merkez koordinatını ver. Koordinatlar Google Maps'te o mekanı göstermeli.
- Gün içinde aktivite sırası = rota sırası olacak şekilde listele.

KONAKLAMA (hotelSuggestions):
- Her şehir için "city", "nights" ve "category" alanlarını ver. "bookingUrl" verme veya boş string bırak; sunucu otomatik Booking.com arama linki (tarih, kişi sayısı, bütçeye göre fiyat filtresi) üretecek.
- Toplam gece sayısı ile start–end tarihleri uyumlu olsun; şehirler arası geceleri mantıklı böl (örnek: 7 gecede Kotor 3 gece, Budva 4 gece).
- "category" alanını kullanıcı mesajındaki kullanılabilir net bütçe ve gece sayısına göre seç; düşük net bütçe → ekonomik/hostel, orta → orta segment, yüksek → 4 yıldızlı veya 5 yıldızlı/butik.
- "category" kısa Türkçe bir etiket olsun (örn. "Orta segment otel", "4 yıldızlı otel").

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
      "city": "Kotor, Montenegro",
      "nights": 3,
      "category": "Orta segment otel"
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
  const gd = req.groupDetails;
  const adults = adultsFromRequest(req);
  const bi = mergeBudgetIncludes(req.budgetIncludes);
  const budgetIncludesText: string[] = [];
  if (bi.flight) budgetIncludesText.push('uçak bileti');
  if (bi.car) budgetIncludesText.push('araç kiralama');
  if (bi.hotel) budgetIncludesText.push('konaklama');
  if (bi.food) budgetIncludesText.push('yeme-içme');
  if (bi.activities) budgetIncludesText.push('aktiviteler');

  const peopleMap = peopleLabels;

  const otmBlock =
    placesText.trim().length > 0
      ? `
Aşağıda ${req.destination} için OpenTripMap'ten alınan gerçek mekanların listesi var.
Öncelikle bu listeden seç; listedeki mekanlar için lat ve lng değerlerini listeden al.
Liste tüm günler için yeterli benzersiz mekan sağlamıyorsa, gerçek ve o bölgede var olan mekanları kendi bilginden ekle (ÖNEMLİ KURALLAR: planda mekan tekrarı yok). Listede olmayan mekanlar için koordinat kurallarına uy.

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
Tatil tipi: ${tripLabels[req.tripType]}
Toplam bütçe: ${req.budget} TL
Bütçeye dahil olan kalemler: ${budgetIncludesText.join(', ') || 'belirtilmedi'}
Kimlerle: ${peopleMap[req.people]}.
Grup (plan ve konaklama uyumu için): ${gd.adults} yetişkin${gd.children > 0 ? `, ${gd.children} çocuk (yaşlar: ${gd.childAges.slice(0, gd.children).join(', ')})` : ', çocuk yok'}, ${gd.rooms} oda. Bu grup için gerçekçi tempo ve (varsa) çocuk dostu aktiviteler düşün.
Bu bütçeye göre uygun otel kategorisi, restoranlar ve aktiviteler öner.
Bütçe dağılımını (budgetBreakdown) yalnızca bütçeye dahil olan kalemler için doldur; dahil olmayan kalem için boş string "" kullan (örn. uçak listede yoksa "ucak": "").
Araç kiralama: ${req.hasRentalCar ? 'Evet, araçlı' : 'Hayır, araçsız'}
Yetişkin sayısı (özet): ${adults}

Konaklama önerilerinde hotelSuggestions içindeki "category" alanını toplam bütçe ve dahil olan kalemlere uygun seç.
${flightBlock}
${otmBlock}
Sadece JSON döndür. Başka hiçbir şey yazma.`;
}

function parseTripPlanJson(text: string): TripPlan {
  let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const jsonStart = clean.indexOf('{');
  if (jsonStart !== -1) {
    clean = clean.substring(jsonStart);
  }

  const openBraces = (clean.match(/{/g) || []).length;
  const closeBraces = (clean.match(/}/g) || []).length;
  const diff = openBraces - closeBraces;
  if (diff > 0) {
    const lastCompleteIndex = clean.lastIndexOf('},');
    if (lastCompleteIndex > 0) {
      clean = clean.substring(0, lastCompleteIndex + 1);
    }
    clean += ']}]}'.repeat(1) + '}'.repeat(Math.max(0, diff - 2));
  } else {
    const jsonEnd = clean.lastIndexOf('}');
    if (jsonEnd !== -1) {
      clean = clean.substring(0, jsonEnd + 1);
    }
  }

  let parsed: TripPlan;
  try {
    parsed = JSON.parse(clean) as TripPlan;
  } catch (e) {
    console.error('JSON parse hatası, ham metin:', clean.substring(0, 500), e);
    throw new Error('JSON parse edilemedi');
  }

  if (!parsed.days || !Array.isArray(parsed.days)) {
    throw new Error('Geçersiz plan yanıtı');
  }
  if (parsed.hotelSuggestions?.length) {
    parsed.hotelSuggestions = parsed.hotelSuggestions.map((h: HotelSuggestion & { bookingSearchUrl?: string }) => {
      const category = typeof h.category === 'string' && h.category.trim() ? h.category.trim() : undefined;
      return {
        city: h.city,
        nights: h.nights,
        category,
        bookingUrl: h.bookingUrl || h.bookingSearchUrl,
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
export function sanitizeNoTicketFlightDays(plan: TripPlan, hasTicket: boolean): TripPlan {
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
  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  let nights = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (!Number.isFinite(nights) || nights < 1) {
    nights = tripNightsBetween(request.startDate, request.endDate);
  }

  let cityCountInstruction = '';
  if (nights <= 3) {
    cityCountInstruction = 'Sadece 1 şehir öner.';
  } else if (nights <= 5) {
    cityCountInstruction = '1 veya 2 şehir öner.';
  } else {
    cityCountInstruction = 'Mutlaka 2-3 farklı şehir öner, tek şehir kabul etme.';
  }

  const cityPrompt = `
${request.destination} için ${nights} gecelik tatilde hangi şehirlerde kalınmalı?
${cityCountInstruction}
Sadece şehir isimlerini İngilizce ver, virgülle ayır. Başka hiçbir şey yazma.
Örnek: Kotor, Budva
`.trim();

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    temperature: 0.2,
    system:
      'You reply with ONLY comma-separated English city names. No other words, no numbering, no explanation.',
    messages: [
      {
        role: 'user',
        content: cityPrompt,
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

export type ClosedVenueClosure = {
  dayNumber: number;
  city: string;
  name: string;
  type: ActivityType;
  time: string;
  duration: string;
};

function parseReplacementsJson(text: string): Array<{ dayNumber: number; closedName: string; activity: Activity }> {
  let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonStart = clean.indexOf('{');
  if (jsonStart !== -1) clean = clean.substring(jsonStart);
  const jsonEnd = clean.lastIndexOf('}');
  if (jsonEnd !== -1) clean = clean.substring(0, jsonEnd + 1);

  let parsed: { replacements?: unknown };
  try {
    parsed = JSON.parse(clean) as { replacements?: unknown };
  } catch (e) {
    console.error('[claude] replacements JSON parse', e);
    return [];
  }

  const raw = parsed.replacements;
  if (!Array.isArray(raw)) return [];

  const out: Array<{ dayNumber: number; closedName: string; activity: Activity }> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const dayNumber = Number(rec.dayNumber);
    const closedName = typeof rec.closedName === 'string' ? rec.closedName.trim() : '';
    const act = rec.activity as Activity | undefined;
    if (!Number.isFinite(dayNumber) || !closedName || !act || typeof act !== 'object') continue;
    const name = typeof act.name === 'string' ? act.name : '';
    if (!name.trim()) continue;
    out.push({
      dayNumber,
      closedName,
      activity: {
        time: typeof act.time === 'string' ? act.time : '',
        name: act.name as string,
        description: typeof act.description === 'string' ? act.description : '',
        type: (['gezi', 'yemek', 'kafe', 'aktif'].includes(String(act.type))
          ? act.type
          : 'gezi') as ActivityType,
        duration: typeof act.duration === 'string' ? act.duration : '',
        lat: typeof act.lat === 'number' ? act.lat : undefined,
        lng: typeof act.lng === 'number' ? act.lng : undefined,
      },
    });
  }
  return out;
}

/** Kapalı mekanlar için alternatif aktiviteler üretir; başarısızsa boş dizi. */
export async function generateReplacementsForClosedVenues(
  request: PlanRequest,
  closures: ClosedVenueClosure[],
): Promise<Array<{ dayNumber: number; closedName: string; activity: Activity }>> {
  if (!closures.length) return [];

  const client = getAnthropicClient();
  const lines = closures
    .map(
      (c) =>
        `- Gün ${c.dayNumber} (${c.city}): "${c.name}" (tip: ${c.type}, saat: ${c.time || '—'}, süre: ${c.duration || '—'})`,
    )
    .join('\n');

  const userMsg = `Şu mekanlar kalıcı olarak kapalı:\n${lines}\n\nBunların yerine aynı gün numarasında, aynı aktivite tipinde (type) ve mümkünse aynı saat bandında gerçek, işletme halinde mekanlar öner. Her kapalı mekan için tam bir aktivite nesnesi üret.\n\nYanıtın SADECE şu JSON formatında olsun, başka metin yazma:\n{\n  "replacements": [\n    {\n      "dayNumber": 1,\n      "closedName": "Kapanan mekanın tam adı (yukarıdaki liste ile birebir aynı)",\n      "activity": {\n        "time": "09:30",\n        "name": "...",\n        "description": "...",\n        "type": "gezi",\n        "duration": "60 dakika",\n        "lat": 0,\n        "lng": 0\n      }\n    }\n  ]\n}\n\nÖNEMLİ: Her replacements öğesi listedeki bir kapalı mekana karşılık gelmeli; closedName, yukarıdaki tırnak içi adla birebir eşleşmeli. lat ve lng gerçek koordinat olsun.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    temperature: 0.4,
    system:
      'You output ONLY valid JSON with a "replacements" array. No markdown, no explanation. Property names in English double quotes only.',
    messages: [{ role: 'user', content: userMsg }],
  });

  const text = extractText(message);
  return parseReplacementsJson(text);
}

export function applyActivityReplacements(
  plan: TripPlan,
  replacements: Array<{ dayNumber: number; closedName: string; activity: Activity }>,
): TripPlan {
  if (!replacements.length) return plan;

  const days = plan.days.map((day) => ({
    ...day,
    activities: [...day.activities],
  }));

  for (const rep of replacements) {
    const day = days.find((d) => d.dayNumber === rep.dayNumber);
    if (!day) continue;
    const idx = day.activities.findIndex((a) => a.name.trim() === rep.closedName.trim());
    if (idx === -1) continue;
    day.activities[idx] = { ...rep.activity };
  }

  return { ...plan, days };
}

export async function generateTripPlan(request: PlanRequest, placesText: string): Promise<TripPlan> {
  const client = getAnthropicClient();
  const userContent = buildUserMessage(request, placesText);

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 10000,
    temperature: 0.5,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = extractText(message);
  if (!text) {
    throw new Error('Boş model yanıtı');
  }
  const plan = parseTripPlanJson(text);
  const sanitized = sanitizeNoTicketFlightDays(plan, request.hasTicket);
  return {
    ...sanitized,
    hotelSuggestions: assignBookingUrlsToHotelSuggestions(sanitized.hotelSuggestions ?? [], request),
  };
}
