export type VideoType = 'movie' | 'series';
export type VideoStatus = 'published' | 'draft' | 'hidden';

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Series {
  id: string;
  name: string;
  description: string | null;
  poster_url: string | null;
  banner_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  title: string;
  description: string | null;
  type: VideoType;
  series_id: string | null;
  poster_url: string | null;
  banner_url: string | null;
  video_url: string | null;
  trailer_url: string | null;
  genre: string | null;
  language: string | null;
  year: number | null;
  duration_minutes: number | null;
  rating: number | null;
  age_rating: string | null;
  featured: boolean;
  trending: boolean;
  status: VideoStatus;
  tags: string[] | null;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: string;
  video_id: string;
  series_id: string;
  season_number: number;
  episode_number: number;
  created_at: string;
}

export interface VideoWithEpisodes extends Video {
  episodes?: Episode[];
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface WatchHistoryItem {
  id: string;
  user_id: string;
  video_id: string;
  watched_at: string;
  video?: Video;
}

export interface ContinueWatchingItem {
  id: string;
  user_id: string;
  video_id: string;
  position_seconds: number;
  duration_seconds: number;
  updated_at: string;
  video?: Video;
}

export interface FavoriteItem {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
  video?: Video;
}

export interface SiteSettings {
  id: number;
  site_name: string;
  logo_url: string | null;
  hero_banner_url: string | null;
  accent_color: string;
  maintenance_mode: boolean;
  updated_at: string;
}

// ============================================================
// ANIME TYPES
// ============================================================

export type AnimeStatus = 'ongoing' | 'completed';
export type AnimeType = 'series' | 'movie' | 'ova' | 'special';
export type AnimePublishStatus = 'published' | 'draft' | 'hidden';

export interface Anime {
  id: string;
  title: string;
  original_title: string | null;
  synopsis: string | null;
  poster_url: string | null;
  banner_url: string | null;
  trailer_url: string | null;
  studio: string | null;
  director: string | null;
  release_date: string | null;
  status: AnimeStatus;
  type: AnimeType;
  episode_count: number;
  season_count: number;
  episode_duration_minutes: number | null;
  rating: number;
  language: string | null;
  subtitle_languages: string | null;
  dub_available: boolean;
  featured: boolean;
  trending: boolean;
  publish_status: AnimePublishStatus;
  views: number;
  created_at: string;
  updated_at: string;
  genres?: string[];
}

export interface AnimeSeason {
  id: string;
  anime_id: string;
  season_number: number;
  title: string | null;
  created_at: string;
}

export interface AnimeEpisode {
  id: string;
  anime_id: string;
  season_id: string | null;
  season_number: number;
  episode_number: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  created_at: string;
}

export interface AnimeReview {
  id: string;
  anime_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
}

export interface AnimeContinueWatchingItem {
  id: string;
  user_id: string;
  anime_id: string;
  episode_id: string | null;
  position_seconds: number;
  duration_seconds: number;
  updated_at: string;
  anime?: Anime;
  episode?: AnimeEpisode | null;
}

export interface AnimeFavoriteItem {
  id: string;
  user_id: string;
  anime_id: string;
  created_at: string;
  anime?: Anime;
}

export interface AnimeWatchHistoryItem {
  id: string;
  user_id: string;
  anime_id: string;
  episode_id: string | null;
  watched_at: string;
  anime?: Anime;
  episode?: AnimeEpisode | null;
}
