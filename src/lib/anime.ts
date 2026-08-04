import { supabase } from '@/lib/supabase';
import type {
  Anime,
  AnimeSeason,
  AnimeEpisode,
  AnimeReview,
  AnimeContinueWatchingItem,
  AnimeFavoriteItem,
  AnimeWatchHistoryItem,
} from '@/types';

// ─── Fetch helpers ──────────────────────────────────────────

export async function fetchAnimeList(opts: {
  trending?: boolean;
  featured?: boolean;
  status?: string;
  type?: string;
  genre?: string;
  limit?: number;
  orderBy?: 'created_at' | 'rating' | 'views' | 'title';
  ascending?: boolean;
}): Promise<Anime[]> {
  let q = supabase.from('anime').select('*');
  q = q.eq('publish_status', 'published');
  if (opts.trending) q = q.eq('trending', true);
  if (opts.featured) q = q.eq('featured', true);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.type) q = q.eq('type', opts.type);
  if (opts.genre) {
    const ids = await animeIdsForGenre(opts.genre);
    if (!ids.length) return [];
    q = q.in('id', ids);
  }
  const order = opts.orderBy ?? 'created_at';
  const ascending = opts.ascending ?? false;
  q = q.order(order, { ascending }).limit(opts.limit ?? 20);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Anime[];
}

async function animeIdsForGenre(genre: string): Promise<string[]> {
  const { data } = await supabase
    .from('anime_genres')
    .select('anime_id')
    .eq('genre', genre);
  return (data ?? []).map((r) => r.anime_id as string);
}

export async function fetchAnimeById(id: string): Promise<Anime | null> {
  const { data, error } = await supabase
    .from('anime')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Anime | null;
}

export async function fetchAnimeGenres(animeId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('anime_genres')
    .select('genre')
    .eq('anime_id', animeId);
  if (error) return [];
  return (data ?? []).map((r) => r.genre as string);
}

export async function fetchSeasons(animeId: string): Promise<AnimeSeason[]> {
  const { data, error } = await supabase
    .from('anime_seasons')
    .select('*')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnimeSeason[];
}

export async function fetchEpisodes(animeId: string): Promise<AnimeEpisode[]> {
  const { data, error } = await supabase
    .from('anime_episodes')
    .select('*')
    .eq('anime_id', animeId)
    .order('season_number', { ascending: true })
    .order('episode_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AnimeEpisode[];
}

export async function fetchEpisodeById(episodeId: string): Promise<AnimeEpisode | null> {
  const { data, error } = await supabase
    .from('anime_episodes')
    .select('*')
    .eq('id', episodeId)
    .maybeSingle();
  if (error) throw error;
  return data as AnimeEpisode | null;
}

export async function fetchSimilarAnime(animeId: string, genres: string[], limit = 12): Promise<Anime[]> {
  if (!genres.length) return [];
  const ids = await animeIdsForGenre(genres[0]);
  const filtered = ids.filter((id) => id !== animeId);
  if (!filtered.length) return [];
  const { data, error } = await supabase
    .from('anime')
    .select('*')
    .in('id', filtered)
    .eq('publish_status', 'published')
    .limit(limit);
  if (error) return [];
  return (data ?? []) as Anime[];
}

export async function searchAnime(query: string, opts?: {
  genre?: string;
  studio?: string;
  year?: number;
  status?: string;
  language?: string;
}): Promise<Anime[]> {
  let q = supabase.from('anime').select('*').eq('publish_status', 'published');
  if (query.trim()) {
    q = q.or(`title.ilike.%${query.trim()}%,original_title.ilike.%${query.trim()}%,studio.ilike.%${query.trim()}%`);
  }
  if (opts?.studio) q = q.ilike('studio', `%${opts.studio}%`);
  if (opts?.status) q = q.eq('status', opts.status);
  if (opts?.language) q = q.ilike('language', `%${opts.language}%`);
  if (opts?.year) {
    q = q.gte('release_date', `${opts.year}-01-01`).lte('release_date', `${opts.year}-12-31`);
  }
  if (opts?.genre) {
    const ids = await animeIdsForGenre(opts.genre);
    q = q.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  }
  const { data, error } = await q.order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as Anime[];
}

export async function incrementAnimeViews(animeId: string): Promise<void> {
  await supabase.rpc('increment_anime_views', { a_id: animeId });
}

// ─── Reviews ─────────────────────────────────────────────────

export async function fetchReviews(animeId: string): Promise<AnimeReview[]> {
  const { data, error } = await supabase
    .from('anime_reviews')
    .select('*, profile:profiles!anime_reviews_user_id_fkey(id, display_name, avatar_url)')
    .eq('anime_id', animeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AnimeReview[];
}

export async function getUserReview(userId: string, animeId: string): Promise<AnimeReview | null> {
  const { data, error } = await supabase
    .from('anime_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('anime_id', animeId)
    .maybeSingle();
  if (error) return null;
  return data as AnimeReview | null;
}

export async function upsertReview(userId: string, animeId: string, rating: number, review: string | null): Promise<void> {
  const { error } = await supabase
    .from('anime_reviews')
    .upsert(
      { user_id: userId, anime_id: animeId, rating, review, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,anime_id' }
    );
  if (error) throw error;
}

// ─── Favorites (My Anime List) ──────────────────────────────

export async function fetchAnimeFavorites(userId: string): Promise<Anime[]> {
  const { data, error } = await supabase
    .from('anime_favorites')
    .select('anime:anime(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as { anime: Anime | null }[];
  return rows.map((r) => r.anime).filter((a): a is Anime => a !== null && a !== undefined);
}

export async function isAnimeFavorite(userId: string, animeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('anime_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('anime_id', animeId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function toggleAnimeFavorite(userId: string, animeId: string): Promise<boolean> {
  const existing = await isAnimeFavorite(userId, animeId);
  if (existing) {
    await supabase.from('anime_favorites').delete().eq('user_id', userId).eq('anime_id', animeId);
    return false;
  }
  const { error } = await supabase
    .from('anime_favorites')
    .insert({ user_id: userId, anime_id: animeId });
  if (error) throw error;
  return true;
}

// ─── Continue watching ───────────────────────────────────────

export async function fetchAnimeContinueWatching(userId: string): Promise<AnimeContinueWatchingItem[]> {
  const { data, error } = await supabase
    .from('anime_continue_watching')
    .select('*, anime:anime(*), episode:anime_episodes(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as unknown as AnimeContinueWatchingItem[];
}

export async function saveAnimeContinueWatching(
  userId: string,
  animeId: string,
  episodeId: string | null,
  positionSeconds: number,
  durationSeconds: number
): Promise<void> {
  const { error } = await supabase
    .from('anime_continue_watching')
    .upsert(
      {
        user_id: userId,
        anime_id: animeId,
        episode_id: episodeId,
        position_seconds: Math.floor(positionSeconds),
        duration_seconds: Math.floor(durationSeconds),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,anime_id' }
    );
  if (error) throw error;
}

export async function getAnimeResumePosition(userId: string, animeId: string): Promise<AnimeContinueWatchingItem | null> {
  const { data, error } = await supabase
    .from('anime_continue_watching')
    .select('*')
    .eq('user_id', userId)
    .eq('anime_id', animeId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AnimeContinueWatchingItem;
}

// ─── Watch history ───────────────────────────────────────────

export async function fetchAnimeWatchHistory(userId: string): Promise<AnimeWatchHistoryItem[]> {
  const { data, error } = await supabase
    .from('anime_watch_history')
    .select('*, anime:anime(*), episode:anime_episodes(*)')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as AnimeWatchHistoryItem[];
}

export async function addToAnimeWatchHistory(userId: string, animeId: string, episodeId: string | null): Promise<void> {
  const { error } = await supabase
    .from('anime_watch_history')
    .upsert(
      { user_id: userId, anime_id: animeId, episode_id: episodeId, watched_at: new Date().toISOString() },
      { onConflict: 'user_id,anime_id' }
    );
  if (error) throw error;
}
