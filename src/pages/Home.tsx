import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, AlertCircle, Sparkles } from 'lucide-react';
import { HeroBanner } from '@/components/HeroBanner';
import { VideoRow } from '@/components/VideoRow';
import { AnimeRow } from '@/components/AnimeRow';
import { SkeletonRow, SkeletonHero } from '@/components/Skeletons';
import { fetchVideos, fetchFeaturedHero } from '@/lib/videos';
import { fetchAnimeList } from '@/lib/anime';
import { fetchContinueWatchingWithVideos } from '@/lib/userData';
import { useAuth } from '@/context/AuthContext';
import type { Video } from '@/types';
import type { Anime as AnimeType } from '@/types';

const GENRE_ROWS = ['Action', 'Comedy', 'Drama', 'Anime', 'Documentary', 'Sci-Fi', 'Thriller', 'Romance'];

export default function Home() {
  const { user } = useAuth();
  const [hero, setHero] = useState<Video | null>(null);
  const [trending, setTrending] = useState<Video[]>([]);
  const [recent, setRecent] = useState<Video[]>([]);
  const [popular, setPopular] = useState<Video[]>([]);
  const [continueWatching, setContinueWatching] = useState<Video[]>([]);
  const [genreMap, setGenreMap] = useState<Record<string, Video[]>>({});
  const [animeTrending, setAnimeTrending] = useState<AnimeType[]>([]);
  const [animeLatest, setAnimeLatest] = useState<AnimeType[]>([]);
  const [animeNew, setAnimeNew] = useState<AnimeType[]>([]);
  const [animeRecommended, setAnimeRecommended] = useState<AnimeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
      p.catch(() => fallback);

    (async () => {
      try {
        const [heroVideo, trendingVids, recentVids, popularVids] = await Promise.all([
          safe(fetchFeaturedHero(), null),
          safe(fetchVideos({ trending: true, limit: 20 }), []),
          safe(fetchVideos({ limit: 20, orderBy: 'created_at' }), []),
          safe(fetchVideos({ limit: 20, orderBy: 'views' }), []),
        ]);

        if (!mounted) return;
        setHero(heroVideo);
        setTrending(trendingVids);
        setRecent(recentVids);
        setPopular(popularVids);

        // Fetch genre rows in parallel — each isolated so one failure doesn't break others
        const genreResults = await Promise.all(
          GENRE_ROWS.map((g) =>
            safe(fetchVideos({ genre: g, limit: 20 }), []).then((v) => [g, v] as const)
          )
        );
        if (!mounted) return;
        const map: Record<string, Video[]> = {};
        for (const [g, vids] of genreResults) map[g] = vids;
        setGenreMap(map);

        // Anime rows — isolated from main content
        const [aTrending, aLatest, aNew, aRec] = await Promise.all([
          safe(fetchAnimeList({ trending: true, limit: 20 }), []),
          safe(fetchAnimeList({ limit: 20, orderBy: 'created_at' }), []),
          safe(fetchAnimeList({ limit: 20, orderBy: 'created_at', type: 'series' }), []),
          safe(fetchAnimeList({ limit: 20, orderBy: 'rating' }), []),
        ]);
        if (!mounted) return;
        setAnimeTrending(aTrending);
        setAnimeLatest(aLatest);
        setAnimeNew(aNew);
        setAnimeRecommended(aRec);

        // Continue watching (only for logged-in users)
        if (user) {
          const cw = await safe(fetchContinueWatchingWithVideos(user.id), []);
          if (mounted) setContinueWatching(cw);
        }
      } catch {
        // Only show the full-page error if the primary content fetches failed
        if (mounted) setError('Failed to load content');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="pt-0">
        <SkeletonHero />
        <div className="pt-8">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 pt-20 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-error" />
        <h1 className="text-xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-400">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {hero ? <HeroBanner video={hero} /> : <EmptyHero />}

      <div className="relative z-10 -mt-16 space-y-2 pt-4">
        {continueWatching.length > 0 && (
          <VideoRow title="Continue Watching" videos={continueWatching} viewAllLink="/continue-watching" />
        )}
        <VideoRow title="Trending Now" videos={trending} viewAllLink="/trending" />
        <VideoRow title="Recently Added" videos={recent} viewAllLink="/recently-added" />
        <VideoRow title="Popular on BytesFlix" videos={popular} />

        {GENRE_ROWS.map((genre) =>
          genreMap[genre]?.length ? (
            <VideoRow key={genre} title={genre} videos={genreMap[genre]} />
          ) : null
        )}

        {/* Anime section */}
        {(animeTrending.length > 0 || animeLatest.length > 0 || animeNew.length > 0 || animeRecommended.length > 0) && (
          <div className="mt-4 border-t border-ink-border pt-8">
            <div className="container-page mb-4 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="font-display text-2xl tracking-wide text-white sm:text-3xl">Anime</h2>
              <Link to="/anime" className="ml-auto text-sm text-neutral-400 transition-colors hover:text-primary">Browse all</Link>
            </div>
          </div>
        )}
        <AnimeRow title="Trending Anime" anime={animeTrending} viewAllLink="/anime" />
        <AnimeRow title="Latest Episodes" anime={animeLatest} viewAllLink="/anime" />
        <AnimeRow title="New Releases" anime={animeNew} viewAllLink="/anime" />
        <AnimeRow title="Recommended Anime" anime={animeRecommended} viewAllLink="/anime" />

        {trending.length === 0 && recent.length === 0 && (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="flex h-[50vh] min-h-[400px] items-center justify-center bg-gradient-to-br from-ink-card via-ink to-black">
      <div className="text-center">
        <Film className="mx-auto mb-4 h-16 w-16 text-neutral-700" />
        <h1 className="font-display text-3xl tracking-wider text-neutral-500">No Content Yet</h1>
        <p className="mt-2 text-neutral-600">Check back soon for new releases.</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="container-page py-20 text-center">
      <Film className="mx-auto mb-4 h-12 w-12 text-neutral-700" />
      <h2 className="text-xl font-semibold text-neutral-400">No videos available</h2>
      <p className="mt-2 text-sm text-neutral-600">
        New content will appear here automatically once uploaded from the admin dashboard.
      </p>
      <Link to="/movies" className="btn-outline mt-6 inline-flex">
        Browse Movies
      </Link>
    </div>
  );
}
