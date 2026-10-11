export type Lang = "en" | "ne";

const en = {
  tagline: "Match gems. Chain combos. No lives, no waiting.",
  play: "Play",
  level: "Level",
  daily: "Daily Challenge",
  dailyDone: "Done today. Come back tomorrow!",
  streak: "day streak",
  map: "Levels",
  moves: "Moves",
  score: "Score",
  goalScore: "Reach {n} points",
  goalCollect: "Collect {n} {gem}",
  goalJelly: "Clear {n} jelly tiles",
  hammer: "Hammer",
  shuffle: "Shuffle",
  plusMoves: "+5 Moves",
  hammerHint: "Tap any gem to smash it",
  win: "Level complete!",
  lose: "Out of moves",
  next: "Next level",
  retry: "Try again",
  home: "Home",
  keepGoing: "Keep going (+5 moves)",
  coins: "coins",
  buy: "Buy",
  settings: "Settings",
  sound: "Sound effects",
  vibration: "Vibration",
  motion: "Reduce motion",
  language: "Language",
  install: "Install app",
  reset: "Reset progress",
  resetConfirm: "Erase all progress?",
  close: "Close",
  howTitle1: "Swap to match 3",
  howBody1: "Drag a gem onto a neighbour. Line up 3 or more of the same gem to clear them.",
  howTitle2: "Make power gems",
  howBody2: "Match 4 for a Line Blaster, an L or T for a Bomb, 5 in a row for a Prism that clears a whole colour.",
  howTitle3: "Combine them",
  howBody3: "Swap two power gems together for huge combos. No lives, no timers: play as long as you like.",
  start: "Let's play",
  bestCombo: "Best combo",
  syncTitle: "Sync across devices",
  syncBlurb: "Play on your phone and laptop with the same progress. End-to-end encrypted: only your devices can read it.",
  syncOff: "Off",
  syncSyncing: "Syncing…",
  syncSynced: "Synced",
  syncOffline: "Offline. Will sync when you're back online",
  syncError: "Couldn't sync. Tap Sync now to retry",
  syncTurnOn: "Turn on sync",
  syncCodeLabel: "Your sync code (keep it private)",
  syncCopy: "Copy code",
  syncCopied: "Copied!",
  syncUseCode: "Use a code from another device",
  syncConnect: "Connect",
  syncBadCode: "That code isn't valid. Copy it again from your other device.",
  syncNow: "Sync now",
  syncTurnOff: "Turn off on this device",
  privacy: "Privacy",
};

const ne: typeof en = {
  tagline: "रत्न मिलाउनुहोस्। कम्बो बनाउनुहोस्। कुनै पर्खाइ छैन।",
  play: "खेल्नुहोस्",
  level: "तह",
  daily: "दैनिक चुनौती",
  dailyDone: "आजको सकियो। भोलि फेरि आउनुहोस्!",
  streak: "दिनको लय",
  map: "तहहरू",
  moves: "चाल",
  score: "अंक",
  goalScore: "{n} अंक पुर्‍याउनुहोस्",
  goalCollect: "{n} {gem} जम्मा गर्नुहोस्",
  goalJelly: "{n} जेली टाइल सफा गर्नुहोस्",
  hammer: "हथौडा",
  shuffle: "फेरबदल",
  plusMoves: "+५ चाल",
  hammerHint: "फुटाउन कुनै रत्न थिच्नुहोस्",
  win: "तह पूरा!",
  lose: "चाल सकियो",
  next: "अर्को तह",
  retry: "फेरि प्रयास",
  home: "गृह",
  keepGoing: "जारी राख्नुहोस् (+५ चाल)",
  coins: "सिक्का",
  buy: "किन्नुहोस्",
  settings: "सेटिङ",
  sound: "आवाज",
  vibration: "कम्पन",
  motion: "एनिमेसन घटाउनुहोस्",
  language: "भाषा",
  install: "एप इन्स्टल गर्नुहोस्",
  reset: "प्रगति मेटाउनुहोस्",
  resetConfirm: "सबै प्रगति मेटाउने?",
  close: "बन्द",
  howTitle1: "३ मिलाउन साट्नुहोस्",
  howBody1: "रत्नलाई छेउको रत्नमा तान्नुहोस्। एउटै रत्न ३ वा बढी लाइनमा मिलाएर हटाउनुहोस्।",
  howTitle2: "शक्ति रत्न बनाउनुहोस्",
  howBody2: "४ मिलाउँदा लाइन ब्लास्टर, L वा T आकारमा बम, र ५ मिलाउँदा पूरै रङ हटाउने प्रिज्म बन्छ।",
  howTitle3: "जोडेर चलाउनुहोस्",
  howBody3: "दुई शक्ति रत्न साटेर ठूलो कम्बो बनाउनुहोस्। जीवन वा टाइमर छैन: मन लागेसम्म खेल्नुहोस्।",
  start: "सुरु गरौँ",
  bestCombo: "उत्कृष्ट कम्बो",
  syncTitle: "उपकरणहरूबीच सिंक",
  syncBlurb: "फोन र ल्यापटपमा एउटै प्रगतिसँग खेल्नुहोस्। पूर्ण इन्क्रिप्टेड: तपाईंका उपकरणले मात्र पढ्न सक्छन्।",
  syncOff: "बन्द",
  syncSyncing: "सिंक हुँदैछ…",
  syncSynced: "सिंक भयो",
  syncOffline: "अफलाइन। अनलाइन भएपछि सिंक हुन्छ",
  syncError: "सिंक भएन। फेरि प्रयास गर्न 'अहिले सिंक' थिच्नुहोस्",
  syncTurnOn: "सिंक खोल्नुहोस्",
  syncCodeLabel: "तपाईंको सिंक कोड (गोप्य राख्नुहोस्)",
  syncCopy: "कोड कपी गर्नुहोस्",
  syncCopied: "कपी भयो!",
  syncUseCode: "अर्को उपकरणको कोड प्रयोग गर्नुहोस्",
  syncConnect: "जोड्नुहोस्",
  syncBadCode: "यो कोड मिलेन। अर्को उपकरणबाट फेरि कपी गर्नुहोस्।",
  syncNow: "अहिले सिंक",
  syncTurnOff: "यो उपकरणमा बन्द गर्नुहोस्",
  privacy: "गोपनीयता",
};

export type Key = keyof typeof en;
const dict = { en, ne };

export function t(lang: Lang, k: Key, vars: Record<string, string | number> = {}): string {
  let s = dict[lang][k];
  for (const [name, v] of Object.entries(vars)) s = s.replace(`{${name}}`, String(lang === "ne" ? toNepaliDigits(v) : v));
  return s;
}

export function toNepaliDigits(v: string | number): string {
  return String(v).replace(/[0-9]/g, (d) => "०१२३४५६७८९"[Number(d)]);
}

export function num(lang: Lang, v: number): string {
  const s = v.toLocaleString("en-US");
  return lang === "ne" ? toNepaliDigits(s) : s;
}

export function allKeysTranslated(): boolean {
  return (Object.keys(en) as Key[]).every((k) => typeof ne[k] === "string" && ne[k].length > 0);
}
