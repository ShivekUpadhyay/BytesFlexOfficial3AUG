import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle, Loader2, Play, ChevronLeft, ChevronRight, Bookmark, Check,
} from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { EmbedPlayer } from '@/components/EmbedPlayer';
import {
  fetchAnimeById, fetchEpisodes, fetchEpisodeById,
  saveAnimeContinueWatching, getAnimeResumePosition,
  addToAnimeWatchHistory, toggleAnimeFavorite, isAnimeFavorite,
} from '@/lib/anime';
import { useAuth } from '@/context/AuthContext';
import { detectVideoProvider } from '@/lib/utils';
import type { Anime, AnimeEpisode } from '@/types';

export default function WatchAnime() {
  const { animeId, episodeId } = useParams<{ animeId: string; episodeId: string }>();
  const { user } = useAuth();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [currentEp, setCurrentEp] = useState<AnimeEpisode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumePos, setResumePos] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);

  const loadEpisode = useCallback(async (epId: string) => {
    setLoading(true);
    setError(null);
    try {
      const ep = await fetchEpisodeById(epId);
      if (!ep) { setError('Episode not found.'); setLoading(false); return; }
      setCurrentEp(ep);
      setSelectedSeason(ep.season_number);

      if (user && anime) {
        const [rp, fav] = await Promise.all([
          getAnimeResumePosition(user.id, anime.id),
          isAnimeFavorite(user.id, anime.id),
        ]);
        if (rp && rp.episode_id === ep.id) {
          setResumePos(rp.position_seconds);
        } else {
          setResumePos(0);
        }
        setIsFav(fav);
        addToAnimeWatchHistory(user.id, anime.id, ep.id).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load episode');
    } finally {
      setLoading(false);
    }
  }, [user, anime]);

  useEffect(() => {
    if (!animeId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const a = await fetchAnimeById(animeId);
        if (!a) { setError('Anime not found.'); setLoading(false); return; }
        if (!mounted) return;
        setAnime(a);
        const eps = await fetchEpisodes(animeId);
        if (!mounted) return;
        setEpisodes(eps);

        if (episodeId) {
          loadEpisode(episodeId);
        } else if (eps.length) {
          loadEpisode(eps[0].id);
        } else {
          setError('No episodes available.');
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load anime');
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [animeId, episodeId, loadEpisode]);

  const seasons = useMemo(() => {
    const map = new Map<number, AnimeEpisode[]>();
    for (const ep of episodes) {
      if (!map.has(ep.season_number)) map.set(ep.season_number, []);
      map.get(ep.season_number)!.push(ep);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [episodes]);

  const currentIdx = useMemo(() => {
    return episodes.findIndex((e) => e.id === currentEp?.id);
  }, [episodes, currentEp]);

  const nextEpisode = currentIdx >= 0 && currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null;
  const prevEpisode = currentIdx > 0 ? episodes[currentIdx - 1] : null;

  const handleProgress = useCallback((current: number, duration: number) => {
    if (!user || !anime || !currentEp) return;
    saveAnimeContinueWatching(user.id, anime.id, currentEp.id, current, duration).catch(() => {});
  }, [user, anime, currentEp]);

  const handleEnded = useCallback(() => {
    if (nextEpisode && anime) {
      loadEpisode(nextEpisode.id);
    }
  }, [nextEpisode, anime, loadEpisode]);

  const handleToggleFav = async () => {
    if (!user || !anime) return;
    try {
      const result = await toggleAnimeFavorite(user.id, anime.id);
      setIsFav(result);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink pt-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 pt-20 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-error" />
        <h1 className="text-xl font-bold text-white">{error ?? 'Anime not found'}</h1>
        <Link to="/anime" className="btn-outline mt-6">Back to Anime</Link>
      </div>
    );
  }

  if (!currentEp || !currentEp.video_url) {
    return (
      <div className="container-page pt-24 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-warning" />
        <h1 className="text-xl font-bold text-white">{anime.title}</h1>
        <p className="mt-2 text-neutral-400">This episode's video is not available yet.</p>
        <Link to={`/anime/${anime.id}`} className="btn-outline mt-6">Back to Details</Link>
      </div>
    );
  }

  const provider = detectVideoProvider(currentEp.video_url);

  return (
    <div className="pt-16">
      {/* Player */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        {(() => {
          if (provider === 'direct' || provider === 'hls' || provider === 'unknown') {
            return (
              <VideoPlayer
                key={currentEp.id}
                src={currentEp.video_url}
                poster={currentEp.thumbnail_url ?? anime.poster_url ?? undefined}
                initialPosition={resumePos}
                onProgress={handleProgress}
                onEnded={handleEnded}
                autoPlay
                nextEpisodeLabel={nextEpisode ? `Next: E${nextEpisode.episode_number}` : undefined}
                onNextEpisode={nextEpisode ? () => loadEpisode(nextEpisode.id) : undefined}
              />
            );
          }
          return <EmbedPlayer url={currentEp.video_url} title={`${anime.title} - Episode ${currentEp.episode_number}`} autoPlay />;
        })()}
      </div>

      {/* Details + Episode list */}
      <div className="container-page mt-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: info */}
          <div className="lg:col-span-2">
            <Link to={`/anime/${anime.id}`} className="text-sm text-primary hover:underline">← Back to {anime.title}</Link>
            <h1 className="mt-2 font-display text-2xl tracking-wide text-white sm:text-3xl">
              {anime.title} — E{currentEp.episode_number}
              {currentEp.title ? `: ${currentEp.title}` : ''}
            </h1>
            {currentEp.description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-300">{currentEp.description}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              {prevEpisode && (
                <Link to={`/anime/watch/${anime.id}/${prevEpisode.id}`} className="btn-ghost">
                  <ChevronLeft className="h-5 w-5" /> Previous
                </Link>
              )}
              {nextEpisode && (
                <Link to={`/anime/watch/${anime.id}/${nextEpisode.id}`} className="btn-ghost">
                  Next <ChevronRight className="h-5 w-5" />
                </Link>
              )}
              {user && (
                <button onClick={handleToggleFav} className="btn-ghost">
                  {isFav ? <Check className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                  {isFav ? 'In My List' : 'Add to My List'}
                </button>
              )}
            </div>
          </div>

          {/* Right: episode list */}
          <div className="card-surface max-h-[500px] overflow-y-auto p-5">
            <h3 className="mb-3 font-semibold text-white">Episodes</h3>
            {seasons.length > 1 && (
              <div className="mb-3">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="input-field w-auto"
                >
                  {seasons.map(([sn]) => (
                    <option key={sn} value={sn}>Season {sn}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              {episodes.filter((e) => e.season_number === selectedSeason).map((ep) => {
                const isActive = ep.id === currentEp.id;
                return (
                  <Link
                    key={ep.id}
                    to={`/anime/watch/${anime.id}/${ep.id}`}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                      isActive ? 'bg-primary/20 text-white' : 'text-neutral-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-border text-xs font-bold">
                      {ep.episode_number}
                    </div>
                    <span className="line-clamp-1 text-sm">{ep.title ?? `Episode ${ep.episode_number}`}</span>
                    {isActive && <Play className="ml-auto h-4 w-4 fill-current text-primary" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
