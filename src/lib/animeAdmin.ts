import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import type { Anime, AnimeSeason, AnimeEpisode, AnimeType, AnimeStatus, AnimePublishStatus } from '@/types';

export interface AnimeInput {
  title: string;
  original_title?: string | null;
  synopsis?: string | null;
  poster_url?: string | null;
  banner_url?: string | null;
  trailer_url?: string | null;
  studio?: string | null;
  director?: string | null;
  release_date?: string | null;
  status?: AnimeStatus;
  type?: AnimeType;
  episode_count?: number;
  season_count?: number;
  episode_duration_minutes?: number | null;
  rating?: number;
  language?: string | null;
  subtitle_languages?: string | null;
  dub_available?: boolean;
  featured?: boolean;
  trending?: boolean;
  publish_status?: AnimePublishStatus;
}

export async function fetchAllAnimeAdmin(): Promise<Anime[]> {
  const { data, error } = await supabase
    .from('anime')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Anime[];
}

export async function createAnime(input: AnimeInput): Promise<Anime> {
  const { data, error } = await supabase
    .from('anime')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Anime;
}

export async function updateAnime(id: string, patch: Partial<Anime>): Promise<Anime> {
  const { data, error } = await supabase
    .from('anime')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Anime;
}

export async function deleteAnime(id: string): Promise<void> {
  const { data: anime } = await supabase
    .from('anime')
    .select('poster_url, banner_url, trailer_url')
    .eq('id', id)
    .maybeSingle();

  if (anime) {
    const filesToDelete: Array<{ bucket: keyof typeof STORAGE_BUCKETS; url: string }> = [];
    if (anime.poster_url) filesToDelete.push({ bucket: 'posters', url: anime.poster_url });
    if (anime.banner_url) filesToDelete.push({ bucket: 'banners', url: anime.banner_url });
    if (anime.trailer_url) filesToDelete.push({ bucket: 'trailers', url: anime.trailer_url });
    for (const { bucket, url } of filesToDelete) {
      const path = extractStoragePath(url);
      if (path) {
        try { await deleteFile(bucket, path); } catch { /* best-effort */ }
      }
    }
  }

  const { error } = await supabase.from('anime').delete().eq('id', id);
  if (error) throw error;
}

export async function setAnimeGenres(animeId: string, genres: string[]): Promise<void> {
  await supabase.from('anime_genres').delete().eq('anime_id', animeId);
  if (genres.length) {
    const rows = genres.map((g) => ({ anime_id: animeId, genre: g }));
    const { error } = await supabase.from('anime_genres').insert(rows);
    if (error) throw error;
  }
}

export async function fetchAnimeGenresAdmin(animeId: string): Promise<string[]> {
  const { data } = await supabase
    .from('anime_genres')
    .select('genre')
    .eq('anime_id', animeId);
  return (data ?? []).map((r) => r.genre as string);
}

// ─── Seasons ─────────────────────────────────────────────────

export async function createSeason(animeId: string, seasonNumber: number, title?: string | null): Promise<AnimeSeason> {
  const { data, error } = await supabase
    .from('anime_seasons')
    .insert({ anime_id: animeId, season_number: seasonNumber, title: title ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as AnimeSeason;
}

export async function fetchSeasonsAdmin(animeId: string): Promise<AnimeSeason[]> {
  const { data, error } = await supabase
    .from('anime_seasons')
    .select('*')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnimeSeason[];
}

export async function deleteSeason(id: string): Promise<void> {
  const { error } = await supabase.from('anime_seasons').delete().eq('id', id);
  if (error) throw error;
}

// ─── Episodes ────────────────────────────────────────────────

export interface EpisodeInput {
  anime_id: string;
  season_id?: string | null;
  season_number: number;
  episode_number: number;
  title?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  duration_minutes?: number | null;
}

export async function createEpisode(input: EpisodeInput): Promise<AnimeEpisode> {
  const { data, error } = await supabase
    .from('anime_episodes')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as AnimeEpisode;
}

export async function updateEpisode(id: string, patch: Partial<AnimeEpisode>): Promise<AnimeEpisode> {
  const { data, error } = await supabase
    .from('anime_episodes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as AnimeEpisode;
}

export async function fetchEpisodesAdmin(animeId: string): Promise<AnimeEpisode[]> {
  const { data, error } = await supabase
    .from('anime_episodes')
    .select('*')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true })
    .order('episode_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnimeEpisode[];
}

export async function deleteEpisode(id: string): Promise<void> {
  const { error } = await supabase.from('anime_episodes').delete().eq('id', id);
  if (error) throw error;
}

// ─── Storage helpers (reuse from admin.ts pattern) ───────────

export async function uploadFile(
  bucket: keyof typeof STORAGE_BUCKETS,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const bucketName = STORAGE_BUCKETS[bucket];
  const ext = file.name.split('.').pop() ?? 'bin';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const { error } = await supabase.storage.from(bucketName).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
  return { path: fileName, publicUrl: data.publicUrl };
}

export async function deleteFile(bucket: keyof typeof STORAGE_BUCKETS, path: string): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKETS[bucket]).remove([path]);
  if (error) throw error;
}

export function extractStoragePath(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const bucketIdx = parts.findIndex((p) => p === 'public');
    if (bucketIdx === -1) return null;
    return parts.slice(bucketIdx + 2).join('/');
  } catch {
    return null;
  }
}
