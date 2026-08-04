import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, AlertCircle } from 'lucide-react';
import { AnimeCard } from '@/components/AnimeCard';
import { SkeletonGrid } from '@/components/Skeletons';
import { fetchAnimeList } from '@/lib/anime';
import type { Anime } from '@/types';

const CATEGORIES = [
  'Trending Anime',
  'Recently Added',
  'New Episodes',
  'Popular Anime',
  'Top Rated Anime',
  'Ongoing Series',
  'Completed Series',
  'Movies',
  'Classics',
  'Action',
  'Adventure',
  'Romance',
  'Comedy',
  'Fantasy',
  'Sci-Fi',
  'Horror',
  'Mystery',
  'Slice of Life',
  'Sports',
  'Mecha',
  'Isekai',
  'Shounen',
  'Seinen',
  'Shojo',
];

export default function AnimePage() {
  const [categoryData, setCategoryData] = useState<Record<string, Anime[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const results = await Promise.all(
          CATEGORIES.map(async (cat) => {
            let items: Anime[] = [];
            switch (cat) {
              case 'Trending Anime':
                items = await fetchAnimeList({ trending: true, limit: 20 });
                break;
              case 'Recently Added':
                items = await fetchAnimeList({ limit: 20, orderBy: 'created_at' });
                break;
              case 'New Episodes':
                items = await fetchAnimeList({ limit: 20, orderBy: 'created_at', type: 'series' });
                break;
              case 'Popular Anime':
                items = await fetchAnimeList({ limit: 20, orderBy: 'views' });
                break;
              case 'Top Rated Anime':
                items = await fetchAnimeList({ limit: 20, orderBy: 'rating' });
                break;
              case 'Ongoing Series':
                items = await fetchAnimeList({ status: 'ongoing', type: 'series', limit: 20 });
                break;
              case 'Completed Series':
                items = await fetchAnimeList({ status: 'completed', type: 'series', limit: 20 });
                break;
              case 'Movies':
                items = await fetchAnimeList({ type: 'movie', limit: 20 });
                break;
              case 'Classics':
                items = await fetchAnimeList({ limit: 20, orderBy: 'created_at', ascending: true });
                break;
              default:
                items = await fetchAnimeList({ genre: cat, limit: 20 });
                break;
            }
            return [cat, items] as const;
          })
        );
        if (!mounted) return;
        const map: Record<string, Anime[]> = {};
        for (const [cat, items] of results) map[cat] = items;
        setCategoryData(map);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load anime');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="container-page pt-24 pb-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="flex items-center gap-2 font-display text-4xl tracking-wide text-white">
          <Sparkles className="h-8 w-8 text-primary" /> Anime
        </h1>
        <p className="mt-1 text-neutral-400">Explore the world of anime — from trending to classics</p>
      </motion.div>

      {loading ? (
        <div className="mt-8 space-y-8">
          <SkeletonGrid count={12} />
          <SkeletonGrid count={12} />
        </div>
      ) : error ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <AlertCircle className="mb-4 h-10 w-10 text-error" />
          <p className="text-neutral-400">{error}</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {CATEGORIES.map((cat) =>
            categoryData[cat]?.length ? (
              <div key={cat}>
                <h2 className="mb-3 font-display text-xl tracking-wide text-neutral-100 sm:text-2xl">{cat}</h2>
                <div className="scrollbar-hide flex gap-3 overflow-x-auto scroll-smooth pb-4">
                  {categoryData[cat].map((a, i) => (
                    <AnimeCard key={a.id} anime={a} index={i} />
                  ))}
                </div>
              </div>
            ) : null
          )}
          {Object.values(categoryData).every((v) => v.length === 0) && (
            <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
              <Sparkles className="mb-4 h-12 w-12 text-neutral-700" />
              <h2 className="text-lg font-semibold text-neutral-400">No anime yet</h2>
              <p className="mt-1 text-sm text-neutral-600">Anime will appear here once uploaded from the admin dashboard.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
