import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, AlertCircle, Sparkles } from 'lucide-react';
import { AnimeCard } from '@/components/AnimeCard';
import { SkeletonGrid } from '@/components/Skeletons';
import { useAuth } from '@/context/AuthContext';
import { fetchAnimeFavorites, fetchAnimeContinueWatching } from '@/lib/anime';
import type { Anime, AnimeContinueWatchingItem } from '@/types';

export default function MyAnimeList() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Anime[]>([]);
  const [continueWatching, setContinueWatching] = useState<AnimeContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        const [favs, cw] = await Promise.all([
          fetchAnimeFavorites(user.id),
          fetchAnimeContinueWatching(user.id),
        ]);
        if (!mounted) return;
        setFavorites(favs);
        setContinueWatching(cw);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load your list');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  return (
    <div className="container-page pt-24 pb-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="flex items-center gap-2 font-display text-4xl tracking-wide text-white">
          <Sparkles className="h-8 w-8 text-primary" /> My Anime List
        </h1>
        <p className="mt-1 text-neutral-400">Your saved anime and continue watching</p>
      </motion.div>

      {loading ? (
        <div className="mt-8"><SkeletonGrid count={8} /></div>
      ) : error ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <AlertCircle className="mb-4 h-10 w-10 text-error" />
          <p className="text-neutral-400">{error}</p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {/* Continue watching */}
          {continueWatching.length > 0 && (
            <div>
              <h2 className="mb-4 font-display text-2xl tracking-wide text-white">Continue Watching</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {continueWatching.map((item, i) => {
                  const a = item.anime;
                  if (!a) return null;
                  const progress = item.duration_seconds ? (item.position_seconds / item.duration_seconds) * 100 : 0;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.4) }}
                      className="group relative overflow-hidden rounded-xl border border-ink-border bg-ink-card"
                    >
                      <Link to={item.episode_id ? `/anime/watch/${a.id}/${item.episode_id}` : `/anime/${a.id}`} className="block">
                        <div className="relative aspect-video overflow-hidden">
                          {item.episode?.thumbnail_url ?? a.poster_url ? (
                            <img src={item.episode?.thumbnail_url ?? a.poster_url ?? ''} alt={a.title} loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-card to-ink-border">
                              <Sparkles className="h-8 w-8 text-neutral-600" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        </div>
                        <div className="p-3">
                          <h3 className="line-clamp-1 font-semibold text-white">{a.title}</h3>
                          <p className="mt-1 text-xs text-neutral-400">
                            {item.episode ? `E${item.episode.episode_number}` : ''} · {Math.floor(progress)}% watched
                          </p>
                        </div>
                      </Link>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Favorites */}
          <div>
            <h2 className="mb-4 font-display text-2xl tracking-wide text-white">My Favorites</h2>
            {favorites.length === 0 ? (
              <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
                <Bookmark className="mb-4 h-12 w-12 text-neutral-700" />
                <h3 className="text-lg font-semibold text-neutral-400">Your anime list is empty</h3>
                <p className="mt-1 text-sm text-neutral-600">Add anime to your list by clicking the + button on any title.</p>
                <Link to="/anime" className="btn-outline mt-6">Browse Anime</Link>
              </div>
            ) : (
              <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-4">
                {favorites.map((a, i) => (
                  <AnimeCard key={a.id} anime={a} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
