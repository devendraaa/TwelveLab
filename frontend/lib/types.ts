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
  speed?: number;
};

export type UserUsage = {
  charUsed: number;
  charLimit: number;
  genCount: number;
};

export type ClonedVoice = {
  id: string;
  user_id: string;
  name: string;
  audio_url: string;
  voice_path?: string;
  status: 'pending' | 'training' | 'ready' | 'failed';
  created_at: string;
  error?: string;
};
