import type { Voice } from "./types";

export const VOICES: Voice[] = [
  { id: "aria",   name: "Aria",   gender: "Female", accent: "American", lang: "EN", emoji: "🇺🇸" },
  { id: "ryan",   name: "Ryan",   gender: "Male",   accent: "British",  lang: "EN", emoji: "🇬🇧" },
  { id: "priya",  name: "Priya",  gender: "Female", accent: "Natural",  lang: "HI", emoji: "🇮🇳" },
  { id: "aisha",  name: "Aisha",  gender: "Female", accent: "Marathi",  lang: "MR", emoji: "🇮🇳" },
  { id: "sofia",  name: "Sofia",  gender: "Female", accent: "Warm",     lang: "ES", emoji: "🇪🇸" },
  { id: "lena",   name: "Lena",   gender: "Female", accent: "Clear",    lang: "DE", emoji: "🇩🇪" },
  { id: "pierre", name: "Pierre", gender: "Male",   accent: "Classic",  lang: "FR", emoji: "🇫🇷" },
];

export const VC: Record<string, string> = {
  aria: "#60a5fa", ryan: "#34d399", priya: "#fb923c",
  aisha: "#f59e0b", sofia: "#f472b6", lena: "#a78bfa", pierre: "#22d3ee",
};

export const SAMPLES: Record<string, string> = {
  Podcast:  "Welcome back to The Builder's Mindset — where founders share the real story behind building their products. Today's guest built a profitable SaaS in just 90 days.",
  Product:  "Introducing TwelveLab — the only text-to-speech platform that actually sounds human. Clone any voice in 60 seconds and ship with our developer API in minutes.",
  Story:    "The old lighthouse keeper had not spoken to another soul in forty-seven days. Each morning he wound the great clockwork, each night he listened to the sea.",
  News:     "Markets rose sharply today as investors responded to better-than-expected inflation data. The Sensex gained over 800 points, crossing a key threshold.",
  Hindi:    "नमस्ते, ट्वेल्वलैब में आपका स्वागत है। यहाँ आप किसी भी टेक्स्ट को असली मानवीय आवाज़ में बदल सकते हैं।",
};
