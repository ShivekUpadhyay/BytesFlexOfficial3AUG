import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, UploadCloud, Check, X, Link2, Sparkles } from 'lucide-react';
import { FileUpload } from '@/components/FileUpload';
import { detectVideoProvider, getVideoSourceInfo } from '@/lib/utils';
import { uploadFile, createAnime, setAnimeGenres } from '@/lib/animeAdmin';
import type { AnimeType, AnimeStatus, AnimePublishStatus } from '@/types';

interface AnimeUploadFormProps {
  onUploaded: () => void;
}

interface FileSlot {
  file: File | null;
  previewUrl: string | null;
}

const ANIME_GENRES = [
  'Action', 'Adventure', 'Romance', 'Comedy', 'Fantasy', 'Sci-Fi', 'Horror',
  'Mystery', 'Slice of Life', 'Sports', 'Mecha', 'Isekai', 'Shounen', 'Seinen', 'Shojo',
];

export function AnimeUploadForm({ onUploaded }: AnimeUploadFormProps) {
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [studio, setStudio] = useState('');
  const [director, setDirector] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [status, setStatus] = useState<AnimeStatus>('ongoing');
  const [type, setType] = useState<AnimeType>('series');
  const [episodeCount, setEpisodeCount] = useState<number | ''>('');
  const [seasonCount, setSeasonCount] = useState<number | ''>(1);
  const [episodeDuration, setEpisodeDuration] = useState<number | ''>('');
  const [rating, setRating] = useState<number | ''>('');
  const [language, setLanguage] = useState('Japanese');
  const [subtitleLanguages, setSubtitleLanguages] = useState('English');
  const [dubAvailable, setDubAvailable] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [trending, setTrending] = useState(false);
  const [publishStatus, setPublishStatus] = useState<AnimePublishStatus>('published');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  const [posterSlot, setPosterSlot] = useState<FileSlot>({ file: null, previewUrl: null });
  const [bannerSlot, setBannerSlot] = useState<FileSlot>({ file: null, previewUrl: null });
  const [trailerSlot, setTrailerSlot] = useState<FileSlot>({ file: null, previewUrl: null });
  const [trailerMode, setTrailerMode] = useState<'file' | 'external'>('file');
  const [trailerUrl, setTrailerUrl] = useState('');

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const reset = () => {
    setTitle(''); setOriginalTitle(''); setSynopsis(''); setStudio(''); setDirector('');
    setReleaseDate(''); setStatus('ongoing'); setType('series'); setEpisodeCount('');
    setSeasonCount(1); setEpisodeDuration(''); setRating(''); setLanguage('Japanese');
    setSubtitleLanguages('English'); setDubAvailable(false); setFeatured(false);
    setTrending(false); setPublishStatus('published'); setSelectedGenres([]);
    setPosterSlot({ file: null, previewUrl: null });
    setBannerSlot({ file: null, previewUrl: null });
    setTrailerSlot({ file: null, previewUrl: null });
    setTrailerMode('file'); setTrailerUrl(''); setProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim()) { setError('Title is required.'); return; }
    if (trailerMode === 'external' && trailerUrl.trim() && detectVideoProvider(trailerUrl.trim()) === 'unknown') {
      setError('Trailer URL is not a recognized video URL.');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const steps = 4;
      let done = 0;
      const bump = () => { done++; setProgress(Math.round((done / steps) * 100)); };

      const posterUrl = posterSlot.file ? (await uploadFile('posters', posterSlot.file)).publicUrl : null;
      bump();
      const bannerUrl = bannerSlot.file ? (await uploadFile('banners', bannerSlot.file)).publicUrl : null;
      bump();
      const trailerUrlFinal = trailerMode === 'external'
        ? trailerUrl.trim() || null
        : trailerSlot.file ? (await uploadFile('trailers', trailerSlot.file)).publicUrl : null;
      bump();
      bump();

      const anime = await createAnime({
        title: title.trim(),
        original_title: originalTitle.trim() || null,
        synopsis: synopsis.trim() || null,
        poster_url: posterUrl,
        banner_url: bannerUrl,
        trailer_url: trailerUrlFinal,
        studio: studio.trim() || null,
        director: director.trim() || null,
        release_date: releaseDate || null,
        status,
        type,
        episode_count: episodeCount || 0,
        season_count: seasonCount || 1,
        episode_duration_minutes: episodeDuration || null,
        rating: rating ? Number(rating) : 0,
        language,
        subtitle_languages: subtitleLanguages,
        dub_available: dubAvailable,
        featured,
        trending,
        publish_status: publishStatus,
      });

      if (selectedGenres.length) {
        await setAnimeGenres(anime.id, selectedGenres);
      }

      setSuccess(true);
      reset();
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <Check className="h-4 w-4" /> Anime created successfully! Add episodes from the Anime management tab.
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          <X className="h-4 w-4" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Anime Type</label>
          <div className="flex gap-3">
            {(['series', 'movie', 'ova', 'special'] as AnimeType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border p-3 text-sm uppercase transition-colors ${
                  type === t ? 'border-primary bg-primary/10 text-white' : 'border-ink-border text-neutral-400 hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Basic info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Anime title" required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Original Title (Romaji)</label>
            <input value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} className="input-field" placeholder="e.g. Shingeki no Kyojin" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Studio</label>
            <input value={studio} onChange={(e) => setStudio(e.target.value)} className="input-field" placeholder="e.g. MAPPA" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Director</label>
            <input value={director} onChange={(e) => setDirector(e.target.value)} className="input-field" placeholder="e.g. Tetsurō Araki" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Release Date</label>
            <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Synopsis</label>
            <textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} rows={3} className="input-field resize-none" placeholder="Anime synopsis" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as AnimeStatus)} className="input-field">
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Publish Status</label>
            <select value={publishStatus} onChange={(e) => setPublishStatus(e.target.value as AnimePublishStatus)} className="input-field">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Episode Count</label>
            <input type="number" value={episodeCount} onChange={(e) => setEpisodeCount(e.target.value ? Number(e.target.value) : '')} className="input-field" placeholder="24" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Season Count</label>
            <input type="number" min="1" value={seasonCount} onChange={(e) => setSeasonCount(e.target.value ? Number(e.target.value) : '')} className="input-field" placeholder="1" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Episode Duration (min)</label>
            <input type="number" value={episodeDuration} onChange={(e) => setEpisodeDuration(e.target.value ? Number(e.target.value) : '')} className="input-field" placeholder="24" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Rating (0-10)</label>
            <input type="number" step="0.1" min="0" max="10" value={rating} onChange={(e) => setRating(e.target.value ? Number(e.target.value) : '')} className="input-field" placeholder="8.5" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Language</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field" placeholder="Japanese" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Subtitle Languages</label>
            <input value={subtitleLanguages} onChange={(e) => setSubtitleLanguages(e.target.value)} className="input-field" placeholder="English, Spanish" />
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={dubAvailable} onChange={(e) => setDubAvailable(e.target.checked)} className="h-5 w-5 rounded accent-primary" />
            <span className="text-sm text-neutral-300">Dub Available</span>
          </label>
        </div>

        {/* Genres */}
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-300">Genres</label>
          <div className="flex flex-wrap gap-2">
            {ANIME_GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selectedGenres.includes(g)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-ink-border text-neutral-400 hover:bg-white/5'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Media uploads */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FileUpload
            label="Poster Image"
            accept="image/*"
            hint="Portrait image, 2:3 ratio recommended"
            previewUrl={posterSlot.previewUrl}
            previewType="image"
            onFileSelected={(file) => {
              const url = URL.createObjectURL(file);
              setPosterSlot({ file, previewUrl: url });
            }}
          />
          <FileUpload
            label="Banner Image"
            accept="image/*"
            hint="Wide landscape image, 16:9 ratio recommended"
            previewUrl={bannerSlot.previewUrl}
            previewType="image"
            onFileSelected={(file) => {
              const url = URL.createObjectURL(file);
              setBannerSlot({ file, previewUrl: url });
            }}
          />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Trailer (optional)</label>
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setTrailerMode('file')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  trailerMode === 'file' ? 'bg-primary text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                }`}
              >
                <UploadCloud className="h-4 w-4" /> Upload File
              </button>
              <button
                type="button"
                onClick={() => setTrailerMode('external')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  trailerMode === 'external' ? 'bg-primary text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                }`}
              >
                <Link2 className="h-4 w-4" /> External URL
              </button>
            </div>
            {trailerMode === 'file' ? (
              <FileUpload
                label=""
                accept="video/mp4,video/webm,video/*"
                hint="Short trailer video"
                previewUrl={trailerSlot.previewUrl}
                previewType="video"
                onFileSelected={(file) => {
                  const url = URL.createObjectURL(file);
                  setTrailerSlot({ file, previewUrl: url });
                }}
              />
            ) : (
              <div className="space-y-2">
                <input
                  type="url"
                  value={trailerUrl}
                  onChange={(e) => setTrailerUrl(e.target.value)}
                  className="input-field"
                  placeholder="Paste a YouTube, Vimeo, or any embeddable URL"
                />
                {(() => {
                  const info = getVideoSourceInfo(trailerUrl.trim());
                  if (!info.embedUrl) return null;
                  return (
                    <div className="rounded-lg border border-ink-border bg-ink-soft p-2">
                      <div className="mx-auto max-h-40 overflow-hidden rounded-lg">
                        <iframe src={info.embedUrl} title="Trailer preview" className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-5 w-5 rounded accent-primary" />
            <span className="text-sm text-neutral-300">Featured</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} className="h-5 w-5 rounded accent-primary" />
            <span className="text-sm text-neutral-300">Trending</span>
          </label>
        </div>

        {/* Progress */}
        {uploading && (
          <div className="rounded-lg border border-ink-border bg-ink-soft p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-neutral-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading... {progress}%
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-border">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <button type="submit" disabled={uploading} className="btn-primary w-full">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-5 w-5" /> Create Anime</>}
        </button>
      </form>
    </motion.div>
  );
}
