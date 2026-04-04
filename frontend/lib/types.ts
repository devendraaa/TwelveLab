export type Voice = {
  id: string;
  name: string;
  gender: string;
  accent: string;
  lang: string;
  emoji: string;
};

export type Generation = {
  id: string;
  voice_id: string;
  text: string;
  char_count: number;
  created_at: string;
  audio_url?: string;
};

export type UserUsage = {
  charUsed: number;
  charLimit: number;
  genCount: number;
};
