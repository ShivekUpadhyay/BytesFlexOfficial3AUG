import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Plus, Check, Star } from 'lucide-react';
import type { Anime } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { toggleAnimeFavorite } from '@/lib/anime';

interface AnimeCardProps {
  anime: Anime;
  index?: number;
}

export function AnimeCard({ anime, index = 0 }: AnimeCardProps) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      const result = await toggleAnimeFavorite(user.id, anime.id);
      setIsFav(result);
    } catch {
      // ignore
    }
  };

  return (
    <Link
      to={`/anime/${anime.id}`}
      className="group relative block w-[160px] shrink-0 sm:w-[200px] md:w-[220px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
        className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ink-card border border-ink-border transition-all duration-300"
        style={{
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
          zIndex: hovered ? 20 : 1,
        }}
      >
        {anime.poster_url ? (
          <img
            src={anime.poster_url}
            alt={anime.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-card to-ink-border">
            <span className="font-display text-3xl text-neutral-600">A</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Top badges */}
        <div className="absolute left-2 top-2 flex gap-1">
          {anime.trending && (
            <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              Trending
            </span>
          )}
          {anime.featured && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">
              Featured
            </span>
          )}
          {anime.status === 'ongoing' && (
            <span className="rounded bg-success px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              Ongoing
            </span>
          )}
        </div>

        {user && (
          <button
            onClick={handleFavorite}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
            aria-label="Toggle My List"
          >
            {isFav ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="line-clamp-1 text-sm font-semibold text-white">{anime.title}</h3>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-300">
            {anime.rating ? (
              <span className="flex items-center gap-0.5 text-secondary">
                <Star className="h-3 w-3 fill-current" />
                {anime.rating.toFixed(1)}
              </span>
            ) : null}
            {anime.release_date ? <span>{new Date(anime.release_date).getFullYear()}</span> : null}
            <span className="uppercase">{anime.type}</span>
          </div>
        </div>

        {/* Hover play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/40">
            <Play className="h-5 w-5 fill-current" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
