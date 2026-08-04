import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Anime } from '@/types';
import { AnimeCard } from './AnimeCard';

interface AnimeRowProps {
  title: string;
  anime: Anime[];
  viewAllLink?: string;
}

export function AnimeRow({ title, anime: items, viewAllLink }: AnimeRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section className="group/row relative mb-8 md:mb-12">
      <div className="container-page mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl tracking-wide text-neutral-100 sm:text-2xl">{title}</h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-sm text-neutral-400 transition-colors hover:text-primary"
          >
            View all
          </Link>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 z-30 hidden h-full w-12 items-center justify-center bg-gradient-to-r from-ink/90 to-transparent text-white opacity-0 transition-opacity group-hover/row:opacity-100 md:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-3 overflow-x-auto scroll-smooth px-4 sm:px-6 lg:px-10 pb-4"
        >
          {items.map((a, i) => (
            <AnimeCard key={a.id} anime={a} index={i} />
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 z-30 hidden h-full w-12 items-center justify-center bg-gradient-to-l from-ink/90 to-transparent text-white opacity-0 transition-opacity group-hover/row:opacity-100 md:flex"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>
    </section>
  );
}
