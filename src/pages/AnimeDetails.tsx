import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star, Calendar, Clock, Globe, Tag, AlertCircle, Loader2,
  Play, Bookmark, Check, Share2, Flag, Film, Tv, Clapperboard, Mic2, Captions,
} from 'lucide-react';
import { AnimeCard } from '@/components/AnimeCard';
import { Modal } from '@/components/Modal';
import {
  fetchAnimeById, fetchAnimeGenres, fetchSeasons, fetchEpisodes,
  fetchSimilarAnime, fetchReviews, getUserReview, upsertReview,
  toggleAnimeFavorite, isAnimeFavorite, incrementAnimeViews,
} from '@/lib/anime';
import { useAuth } from '@/context/AuthContext';
import { formatViews, formatDate } from '@/lib/utils';
import type { Anime as AnimeType, AnimeSeason, AnimeEpisode, AnimeReview } from '@/types';

export default function AnimeDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [anime, setAnime] = useState<AnimeType | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<AnimeSeason[]>([]);
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [similar, setSimilar] = useState<AnimeType[]>([]);
  const [reviews, setReviews] = useState<AnimeReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [rateOpen, setRateOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const a = await fetchAnimeById(id);
        if (!a) { setError('Anime not found.'); setLoading(false); return; }
        setAnime(a);
        incrementAnimeViews(id).catch(() => {});

        const [g, seas, eps, sim, revs] = await Promise.all([
          fetchAnimeGenres(id),
          fetchSeasons(id),
          fetchEpisodes(id),
          fetchAnimeGenres(id).then((gg) => fetchSimilarAnime(id, gg)),
          fetchReviews(id),
        ]);
        if (!mounted) return;
        setGenres(g);
        setSeasons(seas);
        setEpisodes(eps);
        setSimilar(sim);
        setReviews(revs);

        if (user) {
          const [fav, ur] = await Promise.all([
            isAnimeFavorite(user.id, id),
            getUserReview(user.id, id),
          ]);
          if (!mounted) return;
          setIsFav(fav);
          if (ur) { setUserRating(ur.rating); setUserReview(ur.review ?? ''); }
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load anime');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, user]);

  const seasonEpisodes = useMemo(() => {
    return episodes.filter((e) => e.season_number === selectedSeason);
  }, [episodes, selectedSeason]);

  const handleToggleFav = async () => {
    if (!user || !anime) return;
    try {
      const result = await toggleAnimeFavorite(user.id, anime.id);
      setIsFav(result);
    } catch { /* ignore */ }
  };

  const handleShare = async () => {
    if (anime) {
      try {
        await navigator.share?.({ title: anime.title, url: window.location.href });
      } catch {
        navigator.clipboard?.writeText(window.location.href);
      }
    }
  };

  const handleSaveReview = async () => {
    if (!user || !anime || userRating === 0) return;
    try {
      await upsertReview(user.id, anime.id, userRating, userReview.trim() || null);
      setReviewSaved(true);
      const revs = await fetchReviews(anime.id);
      setReviews(revs);
      setTimeout(() => setRateOpen(false), 1000);
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

  return (
    <div className="pt-16">
      {/* Banner */}
      <div className="relative h-[50vh] min-h-[360px] w-full overflow-hidden">
        {anime.banner_url ? (
          <img src={anime.banner_url} alt={anime.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : anime.poster_url ? (
          <img src={anime.poster_url} alt={anime.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-ink-card via-ink to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 to-transparent" />
      </div>

      <div className="container-page -mt-40 relative z-10">
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Poster */}
          <div className="w-40 shrink-0 sm:w-52">
            <div className="aspect-[2/3] overflow-hidden rounded-xl border border-ink-border bg-ink-card shadow-2xl">
              {anime.poster_url ? (
                <img src={anime.poster_url} alt={anime.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Film className="h-12 w-12 text-neutral-600" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-display text-3xl tracking-wide text-white sm:text-4xl md:text-5xl">{anime.title}</h1>
              {anime.original_title && anime.original_title !== anime.title && (
                <p className="mt-1 text-lg text-neutral-400">{anime.original_title}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-neutral-300">
                {anime.rating ? (
                  <span className="flex items-center gap-1 font-semibold text-secondary">
                    <Star className="h-4 w-4 fill-current" />{anime.rating.toFixed(1)}
                  </span>
                ) : null}
                {anime.release_date && (
                  <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(anime.release_date)}</span>
                )}
                {anime.episode_duration_minutes && (
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{anime.episode_duration_minutes}m/ep</span>
                )}
                {anime.language && (
                  <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{anime.language}</span>
                )}
                <span className="rounded border border-white/30 px-1.5 py-0.5 text-xs uppercase">{anime.type}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${anime.status === 'ongoing' ? 'bg-success/20 text-success' : 'bg-neutral-700 text-neutral-300'}`}>
                  {anime.status}
                </span>
                <span className="text-neutral-500">{formatViews(anime.views)}</span>
              </div>

              {anime.synopsis && (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-300 sm:text-base">{anime.synopsis}</p>
              )}

              {/* Genres */}
              {genres.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <Link key={g} to={`/anime?genre=${encodeURIComponent(g)}`} className="rounded-full bg-ink-card border border-ink-border px-3 py-1 text-xs text-neutral-300 transition-colors hover:border-primary hover:text-white">
                      {g}
                    </Link>
                  ))}
                </div>
              )}

              {/* Meta details */}
              <div className="mt-4 grid gap-2 text-sm text-neutral-300 sm:grid-cols-2 lg:grid-cols-3">
                {anime.studio && (
                  <div className="flex items-center gap-2"><Clapperboard className="h-4 w-4 text-neutral-500" /><span>Studio: {anime.studio}</span></div>
                )}
                {anime.director && (
                  <div className="flex items-center gap-2"><Film className="h-4 w-4 text-neutral-500" /><span>Director: {anime.director}</span></div>
                )}
                {anime.season_count > 0 && (
                  <div className="flex items-center gap-2"><Tv className="h-4 w-4 text-neutral-500" /><span>Seasons: {anime.season_count}</span></div>
                )}
                {anime.episode_count > 0 && (
                  <div className="flex items-center gap-2"><Tv className="h-4 w-4 text-neutral-500" /><span>Episodes: {anime.episode_count}</span></div>
                )}
                {anime.subtitle_languages && (
                  <div className="flex items-center gap-2"><Captions className="h-4 w-4 text-neutral-500" /><span>Subtitles: {anime.subtitle_languages}</span></div>
                )}
                <div className="flex items-center gap-2"><Mic2 className="h-4 w-4 text-neutral-500" /><span>Dub: {anime.dub_available ? 'Available' : 'Not available'}</span></div>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                {episodes.length > 0 ? (
                  <Link to={`/anime/watch/${anime.id}/${episodes[0].id}`} className="btn-primary">
                    <Play className="h-5 w-5 fill-current" /> Watch Now
                  </Link>
                ) : anime.trailer_url ? (
                  <a href={anime.trailer_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                    <Play className="h-5 w-5 fill-current" /> Watch Trailer
                  </a>
                ) : null}
                {user && (
                  <button onClick={handleToggleFav} className="btn-ghost">
                    {isFav ? <Check className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                    {isFav ? 'In My List' : 'Add to My List'}
                  </button>
                )}
                <button onClick={handleShare} className="btn-ghost">
                  <Share2 className="h-5 w-5" /> Share
                </button>
                {user && (
                  <button onClick={() => setRateOpen(true)} className="btn-ghost">
                    <Star className="h-5 w-5" /> Rate
                  </button>
                )}
                {user && (
                  <button onClick={() => setReportOpen(true)} className="btn-ghost">
                    <Flag className="h-5 w-5" /> Report
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Episodes */}
        {episodes.length > 0 && (
          <div className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl tracking-wide text-white">Episodes</h2>
              {seasons.length > 1 && (
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="input-field w-auto"
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.season_number}>
                      {s.title ? `Season ${s.season_number}: ${s.title}` : `Season ${s.season_number}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {seasonEpisodes.map((ep) => (
                <Link
                  key={ep.id}
                  to={`/anime/watch/${anime.id}/${ep.id}`}
                  className="group flex gap-3 rounded-xl border border-ink-border bg-ink-card p-3 transition-colors hover:border-primary"
                >
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-ink-border">
                    {ep.thumbnail_url ? (
                      <img src={ep.thumbnail_url} alt={ep.title ?? `Episode ${ep.episode_number}`} loading="lazy" className="h-full w-full object-cover" />
                    ) : anime.poster_url ? (
                      <img src={anime.poster_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Play className="h-6 w-6 text-neutral-600" /></div>
                    )}
                    <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="h-6 w-6 fill-current text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-sm font-semibold text-white">
                      E{ep.episode_number}: {ep.title ?? `Episode ${ep.episode_number}`}
                    </h3>
                    {ep.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{ep.description}</p>
                    )}
                    {ep.duration_minutes && (
                      <span className="mt-1 flex items-center gap-1 text-xs text-neutral-500"><Clock className="h-3 w-3" />{ep.duration_minutes}m</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Similar Anime */}
        {similar.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 font-display text-2xl tracking-wide text-white">Similar Anime</h2>
            <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-4">
              {similar.map((a, i) => (
                <AnimeCard key={a.id} anime={a} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 font-display text-2xl tracking-wide text-white">Reviews</h2>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="card-surface p-4">
                  <div className="flex items-center gap-3">
                    {r.profile?.avatar_url ? (
                      <img src={r.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                        {(r.profile?.display_name ?? 'U').charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-white">{r.profile?.display_name ?? 'Anonymous'}</span>
                    <span className="flex items-center gap-0.5 text-sm text-secondary">
                      <Star className="h-3 w-3 fill-current" />{r.rating}
                    </span>
                    <span className="text-xs text-neutral-500">{formatDate(r.created_at)}</span>
                  </div>
                  {r.review && <p className="mt-2 text-sm text-neutral-300">{r.review}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rate Modal */}
      <Modal open={rateOpen} onClose={() => setRateOpen(false)} title="Rate this anime">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">Your rating (1-10)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setUserRating(n)}
                  className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-bold transition-colors ${
                    userRating === n ? 'bg-primary text-white' : 'bg-ink-border text-neutral-300 hover:bg-ink-border/70'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Review (optional)</label>
            <textarea
              value={userReview}
              onChange={(e) => setUserReview(e.target.value)}
              rows={4}
              className="input-field resize-none"
              placeholder="Share your thoughts..."
            />
          </div>
          {reviewSaved && (
            <p className="flex items-center gap-2 text-sm text-success"><Check className="h-4 w-4" /> Review saved!</p>
          )}
          <button onClick={handleSaveReview} disabled={userRating === 0} className="btn-primary w-full">
            Save Rating
          </button>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this anime">
        <p className="text-sm text-neutral-400">If you believe this content violates our policies, please describe the issue and our team will review it.</p>
        <textarea rows={4} className="input-field mt-4 resize-none" placeholder="Describe the issue..." />
        <button onClick={() => setReportOpen(false)} className="btn-primary mt-4 w-full">Submit Report</button>
      </Modal>
    </div>
  );
}
