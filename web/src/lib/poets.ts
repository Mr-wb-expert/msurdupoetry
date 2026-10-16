/**
 * Author string (as saved in `Poem.author`) -> poet page slug. Mirrors
 * `api/poets.py`: a known author links to their hub page, anything else
 * renders as plain text.
 */
const ALIASES: Record<string, string> = {
  "Mujahid Sajjad": "mujahid-sajjad",
  "Mohsin Naqvi": "mohsin-naqvi",
  "شہید محسن نقوی": "mohsin-naqvi",
  "Jaun Elia": "jaun-elia",
  "Faiz Ahmed Faiz": "faiz-ahmed-faiz",
  "Ahmed Faraz": "ahmed-faraz",
  "Parveen Shakir": "parveen-shakir",
  "غزالہ انجم": "ghazala-anjum",
  "علامہ محمد اقبال": "allama-iqbal",
  "نذیر اکبر آبادی": "nazeer-akbarabadi",
  "ظفر علی خان": "zafar-ali-khan",
  "مخدوم محی الدین": "makhdoom-mohiuddin",
  "ن م راشد": "n-m-rashid",
  "میراجی": "meeraji",
  "ناصر کاظمی": "nasir-kazmi",
  "Nasir Kazmi": "nasir-kazmi",
  "مصطفیٰ زیدی": "mustafa-zaidi",
  "مصطفی زیدی": "mustafa-zaidi",
  "Mustafa Zaidi": "mustafa-zaidi",
  "مجید امجد": "majeed-amjad",
  "شکیب جلالی": "shakeb-jalali",
  "میر تقی میر": "mir-taqi-mir",
  "مرزا اسد اللہ خان غالب": "mirza-ghalib",
  "داغ دہلوی": "dagh-dehlvi",
  "بہادر شاہ ظفر": "bahadur-shah-zafar",
  "جگر مراد آبادی": "jigar-moradabadi",
  "اکبر الہ آبادی": "akbar-allahabadi",
  "الطاف حسین حالی": "altaf-hussain-hali",
  "مومن خان مومن": "momin-khan-momin",
  "محمد ابراہیم ذوق": "ibrahim-zauq",
};

/** The hub URL for an author, or null when they have no poet page. */
export function poetHref(author: string | null | undefined): string | null {
  if (!author) return null;
  const slug = ALIASES[author];
  return slug ? `/poets/${slug}` : null;
}

/**
 * Author string -> the roman name a page title should use. Only the Urdu
 * spellings need a row: an author already written in latin is its own roman
 * name. Mirrors `roman_name` in api/poets.py — a page's head must read the
 * same before and after hydration.
 */
const ROMAN: Record<string, string> = {
  "شہید محسن نقوی": "Mohsin Naqvi",
  "غزالہ انجم": "Ghazala Anjum",
  "مجید امجد": "Majeed Amjad",
  "شکیب جلالی": "Shakeb Jalali",
  "علامہ محمد اقبال": "Allama Iqbal",
  "نذیر اکبر آبادی": "Nazeer Akbarabadi",
  "ظفر علی خان": "Zafar Ali Khan",
  "مخدوم محی الدین": "Makhdoom Mohiuddin",
  "ن م راشد": "N. M. Rashid",
  "میراجی": "Meeraji",
  "ناصر کاظمی": "Nasir Kazmi",
  "مصطفیٰ زیدی": "Mustafa Zaidi",
  "مصطفی زیدی": "Mustafa Zaidi",
  "میر تقی میر": "Mir Taqi Mir",
  "مرزا اسد اللہ خان غالب": "Mirza Ghalib",
  "داغ دہلوی": "Dagh Dehlvi",
  "بہادر شاہ ظفر": "Bahadur Shah Zafar",
  "جگر مراد آبادی": "Jigar Moradabadi",
  "اکبر الہ آبادی": "Akbar Allahabadi",
  "الطاف حسین حالی": "Altaf Hussain Hali",
  "مومن خان مومن": "Momin Khan Momin",
  "محمد ابراہیم ذوق": "Ibrahim Zauq",
};

export function romanAuthor(author: string | null | undefined): string | null {
  if (!author) return null;
  return ROMAN[author] ?? author;
}