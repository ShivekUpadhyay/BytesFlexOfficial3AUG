import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trash2, Pencil, Eye, EyeOff, Check, X, Loader2, Sparkles, Plus,
  ChevronDown, ChevronRight, Film, Link2, UploadCloud,
} from 'lucide-react';
import {
  fetchAllAnimeAdmin, updateAnime, deleteAnime, uploadFile, deleteFile, extractStoragePath,
  setAnimeGenres, fetchAnimeGenresAdmin,
  fetchSeasonsAdmin, createSeason, deleteSeason,
  fetchEpisodesAdmin, createEpisode, updateEpisode, deleteEpisode,
} from '@/lib/animeAdmin';
import { detectVideoProvider, getVideoSourceInfo, formatViews, formatDate } from '@/lib/utils';
import { FileUpload } from '@/components/FileUpload';
import type { Anime, AnimeType, AnimeStatus, AnimePublishStatus, AnimeSeason, AnimeEpisode } from '@/types';

const ANIME_GENRES = [
  'Action', 'Adventure', 'Romance', 'Comedy', 'Fantasy', 'Sci-Fi', 'Horror',
  'Mystery', 'Slice of Life', 'Sports', 'Mecha', 'Isekai', 'Shounen', 'Seinen', 'Shojo',
];

export function AnimeManagement() {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AnimePublishStatus | 'all'>('all');
  const [editing, setEditing] = useState<Anime | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllAnimeAdmin();
      setAnimeList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load anime');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (anime: Anime, newStatus: AnimePublishStatus) => {
    try {
      await updateAnime(anime.id, { publish_status: newStatus });
      setAnimeList((prev) => prev.map((a) => (a.id === anime.id ? { ...a, publish_status: newStatus } : a)));
    } catch { /* ignore */ }
  };

  const handleDelete = async (anime: Anime) => {
    if (!confirm(`Delete "${anime.title}"? This will also delete all seasons and episodes. This cannot be undone.`)) return;
    try {
      await deleteAnime(anime.id);
      setAnimeList((prev) => prev.filter((a) => a.id !== anime.id));
    } catch { /* ignore */ }
  };

  const filtered = animeList.filter((a) => {
    const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.publish_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="py-20 text-center text-error"><p>{error}</p></div>;
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-ink-border bg-ink-card px-3">
          <Sparkles className="h-4 w-4 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anime..."
            className="bg-transparent py-2 text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'published', 'draft', 'hidden'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-primary text-white' : 'bg-ink-card text-neutral-300 hover:bg-ink-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles className="mb-4 h-12 w-12 text-neutral-700" />
          <p className="text-neutral-400">No anime found. Upload your first anime from the Upload tab.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((anime, i) => (
            <div key={anime.id}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex items-center gap-4 rounded-xl border border-ink-border bg-ink-card p-3"
              >
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-border">
                  {anime.poster_url ? (
                    <img src={anime.poster_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><Sparkles className="h-5 w-5 text-neutral-600" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 font-semibold text-white">{anime.title}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                    <span className="rounded bg-ink-border px-1.5 py-0.5 uppercase">{anime.type}</span>
                    {anime.studio && <span>{anime.studio}</span>}
                    <span>{formatViews(anime.views)}</span>
                    <span>{formatDate(anime.created_at)}</span>
                  </div>
                </div>
                <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${
                  anime.publish_status === 'published' ? 'bg-success/20 text-success' :
                  anime.publish_status === 'draft' ? 'bg-warning/20 text-warning' :
                  'bg-neutral-700 text-neutral-300'
                }`}>
                  {anime.publish_status}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setExpandedId(expandedId === anime.id ? null : anime.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white"
                    title="Manage seasons & episodes"
                  >
                    {expandedId === anime.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {anime.publish_status === 'published' ? (
                    <button onClick={() => handleStatusChange(anime, 'hidden')} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white" title="Hide">
                      <EyeOff className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => handleStatusChange(anime, 'published')} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white" title="Publish">
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => setEditing(anime)} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(anime)} className="grid h-8 w-8 place-items-center rounded-lg text-error hover:bg-error/10" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>

              {/* Expanded: seasons + episodes */}
              {expandedId === anime.id && (
                <SeasonEpisodeManager anime={anime} />
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditAnimeModal
          anime={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            try {
              const updated = await updateAnime(editing.id, patch);
              setAnimeList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
              setEditing(null);
            } catch { /* ignore */ }
          }}
        />
      )}
    </div>
  );
}

// ─── Season & Episode Manager ───────────────────────────────

function SeasonEpisodeManager({ anime }: { anime: Anime }) {
  const [seasons, setSeasons] = useState<AnimeSeason[]>([]);
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSeasonNum, setNewSeasonNum] = useState<number | ''>('');
  const [newSeasonTitle, setNewSeasonTitle] = useState('');
  const [showEpForm, setShowEpForm] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);

  // Episode form state
  const [epSeasonNum, setEpSeasonNum] = useState<number>(1);
  const [epNumber, setEpNumber] = useState<number | ''>(1);
  const [epTitle, setEpTitle] = useState('');
  const [epDesc, setEpDesc] = useState('');
  const [epThumbSlot, setEpThumbSlot] = useState<{ file: File | null; previewUrl: string | null }>({ file: null, previewUrl: null });
  const [epVideoMode, setEpVideoMode] = useState<'file' | 'external'>('file');
  const [epVideoUrl, setEpVideoUrl] = useState('');
  const [epVideoFile, setEpVideoFile] = useState<File | null>(null);
  const [epVideoPreview, setEpVideoPreview] = useState<string | null>(null);
  const [epDuration, setEpDuration] = useState<number | ''>('');
  const [savingEp, setSavingEp] = useState(false);
  const [epError, setEpError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([fetchSeasonsAdmin(anime.id), fetchEpisodesAdmin(anime.id)]);
      setSeasons(s);
      setEpisodes(e);
      if (s.length) { setSelectedSeason(s[0].season_number); setEpSeasonNum(s[0].season_number); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [anime.id]);

  const handleAddSeason = async () => {
    if (!newSeasonNum) return;
    try {
      await createSeason(anime.id, Number(newSeasonNum), newSeasonTitle.trim() || null);
      setNewSeasonNum(''); setNewSeasonTitle('');
      loadAll();
    } catch { /* ignore */ }
  };

  const handleDeleteSeason = async (id: string) => {
    if (!confirm('Delete this season and all its episodes?')) return;
    try { await deleteSeason(id); loadAll(); } catch { /* ignore */ }
  };

  const handleAddEpisode = async () => {
    setEpError(null);
    if (!epNumber) { setEpError('Episode number is required.'); return; }
    if (epVideoMode === 'file' && !epVideoFile) { setEpError('A video file is required.'); return; }
    if (epVideoMode === 'external' && !epVideoUrl.trim()) { setEpError('A video URL is required.'); return; }
    if (epVideoMode === 'external' && detectVideoProvider(epVideoUrl.trim()) === 'unknown') {
      setEpError('Please enter a valid video URL.'); return;
    }
    setSavingEp(true);
    try {
      let thumbUrl: string | null = null;
      if (epThumbSlot.file) {
        thumbUrl = (await uploadFile('posters', epThumbSlot.file)).publicUrl;
      }
      let videoUrl: string | null = null;
      if (epVideoMode === 'file' && epVideoFile) {
        videoUrl = (await uploadFile('videos', epVideoFile)).publicUrl;
      } else if (epVideoMode === 'external') {
        videoUrl = epVideoUrl.trim();
      }
      await createEpisode({
        anime_id: anime.id,
        season_number: epSeasonNum,
        episode_number: Number(epNumber),
        title: epTitle.trim() || null,
        description: epDesc.trim() || null,
        thumbnail_url: thumbUrl,
        video_url: videoUrl,
        duration_minutes: epDuration || null,
      });
      // Reset form
      setEpNumber(''); setEpTitle(''); setEpDesc(''); setEpThumbSlot({ file: null, previewUrl: null });
      setEpVideoFile(null); setEpVideoPreview(null); setEpVideoUrl(''); setEpVideoMode('file');
      setEpDuration(''); setShowEpForm(false);
      loadAll();
    } catch (err) {
      setEpError(err instanceof Error ? err.message : 'Failed to save episode.');
    } finally {
      setSavingEp(false);
    }
  };

  const handleDeleteEpisode = async (id: string) => {
    if (!confirm('Delete this episode?')) return;
    try { await deleteEpisode(id); loadAll(); } catch { /* ignore */ }
  };

  if (loading) {
    return <div className="py-4 pl-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const seasonEpisodes = episodes.filter((e) => e.season_number === selectedSeason);

  return (
    <div className="ml-4 mt-1 rounded-xl border border-ink-border bg-ink-soft/50 p-4">
      {/* Add season */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Season #</label>
          <input type="number" min="1" value={newSeasonNum} onChange={(e) => setNewSeasonNum(e.target.value ? Number(e.target.value) : '')} className="input-field w-24" placeholder="2" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-neutral-500">Season Title (optional)</label>
          <input value={newSeasonTitle} onChange={(e) => setNewSeasonTitle(e.target.value)} className="input-field" placeholder="e.g. Shingeki no Baika" />
        </div>
        <button onClick={handleAddSeason} className="btn-ghost !py-2.5 text-sm">
          <Plus className="h-4 w-4" /> Add Season
        </button>
      </div>

      {/* Season tabs */}
      {seasons.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {seasons.map((s) => (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedSeason(s.season_number)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedSeason === s.season_number ? 'bg-primary text-white' : 'bg-ink-card text-neutral-300 hover:bg-ink-border'
                  }`}
                >
                  Season {s.season_number}
                </button>
                <button onClick={() => handleDeleteSeason(s.id)} className="grid h-6 w-6 place-items-center rounded text-neutral-500 hover:text-error" title="Delete season">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Episode list */}
          <div className="space-y-1">
            {seasonEpisodes.length === 0 ? (
              <p className="py-2 text-sm text-neutral-500">No episodes in this season yet.</p>
            ) : (
              seasonEpisodes.map((ep) => (
                <div key={ep.id} className="flex items-center gap-3 rounded-lg border border-ink-border bg-ink-card p-2">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-border text-xs font-bold">{ep.episode_number}</div>
                  <div className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm text-white">{ep.title ?? `Episode ${ep.episode_number}`}</span>
                    {ep.video_url && <span className="text-xs text-neutral-500">{detectVideoProvider(ep.video_url)} · {ep.duration_minutes ?? '?'}m</span>}
                  </div>
                  <button onClick={() => handleDeleteEpisode(ep.id)} className="grid h-7 w-7 place-items-center rounded text-error hover:bg-error/10" title="Delete episode">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add episode form */}
          {showEpForm ? (
            <div className="mt-4 rounded-xl border border-ink-border bg-ink-card p-4">
              <h4 className="mb-3 text-sm font-semibold text-white">Add Episode</h4>
              {epError && <p className="mb-3 text-sm text-error">{epError}</p>}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Season</label>
                  <select value={epSeasonNum} onChange={(e) => setEpSeasonNum(Number(e.target.value) as number)} className="input-field">
                    {seasons.map((s) => <option key={s.id} value={s.season_number}>Season {s.season_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Episode #</label>
                  <input type="number" min="1" value={epNumber} onChange={(e) => setEpNumber(e.target.value ? Number(e.target.value) : '')} className="input-field" placeholder="1" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-neutral-500">Duration (min)</label>
                  <input type="number" value={epDuration} onChange={(e) => setEpDuration(e.target.value ? Number(e.target.value) : '')} className="input-field" placeholder="24" />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs text-neutral-500">Title</label>
                  <input value={epTitle} onChange={(e) => setEpTitle(e.target.value)} className="input-field" placeholder="Episode title" />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs text-neutral-500">Description</label>
                  <textarea value={epDesc} onChange={(e) => setEpDesc(e.target.value)} rows={2} className="input-field resize-none" placeholder="Episode description" />
                </div>
              </div>

              {/* Thumbnail */}
              <div className="mt-3">
                <FileUpload
                  label="Episode Thumbnail (optional)"
                  accept="image/*"
                  hint="16:9 image recommended"
                  previewUrl={epThumbSlot.previewUrl}
                  previewType="image"
                  onFileSelected={(file) => {
                    const url = URL.createObjectURL(file);
                    setEpThumbSlot({ file, previewUrl: url });
                  }}
                />
              </div>

              {/* Video source */}
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium text-neutral-300">Video Source</label>
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEpVideoMode('file')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${epVideoMode === 'file' ? 'bg-primary text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}
                  >
                    <UploadCloud className="h-4 w-4" /> Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setEpVideoMode('external')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${epVideoMode === 'external' ? 'bg-primary text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10'}`}
                  >
                    <Link2 className="h-4 w-4" /> External URL
                  </button>
                </div>
                {epVideoMode === 'file' ? (
                  <FileUpload
                    label=""
                    accept="video/mp4,video/webm,video/*"
                    hint="MP4 recommended"
                    previewUrl={epVideoPreview}
                    previewType="video"
                    onFileSelected={(file) => {
                      if (file) { const url = URL.createObjectURL(file); setEpVideoFile(file); setEpVideoPreview(url); }
                      else { setEpVideoFile(null); setEpVideoPreview(null); }
                    }}
                  />
                ) : (
                  <input type="url" value={epVideoUrl} onChange={(e) => setEpVideoUrl(e.target.value)} className="input-field" placeholder="Paste any video URL" />
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={handleAddEpisode} disabled={savingEp} className="btn-primary !py-2.5 text-sm">
                  {savingEp ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save Episode</>}
                </button>
                <button onClick={() => setShowEpForm(false)} className="btn-outline !py-2.5 text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowEpForm(true)} className="mt-3 btn-ghost !py-2 text-sm">
              <Plus className="h-4 w-4" /> Add Episode
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Edit Anime Modal ───────────────────────────────────────

function EditAnimeModal({
  anime,
  onClose,
  onSave,
}: {
  anime: Anime;
  onClose: () => void;
  onSave: (patch: Partial<Anime>) => Promise<void>;
}) {
  const [title, setTitle] = useState(anime.title);
  const [originalTitle, setOriginalTitle] = useState(anime.original_title ?? '');
  const [synopsis, setSynopsis] = useState(anime.synopsis ?? '');
  const [studio, setStudio] = useState(anime.studio ?? '');
  const [director, setDirector] = useState(anime.director ?? '');
  const [releaseDate, setReleaseDate] = useState(anime.release_date ?? '');
  const [status, setStatus] = useState<AnimeStatus>(anime.status);
  const [type, setType] = useState<AnimeType>(anime.type);
  const [episodeCount, setEpisodeCount] = useState<number | ''>(anime.episode_count ?? '');
  const [seasonCount, setSeasonCount] = useState<number | ''>(anime.season_count ?? '');
  const [episodeDuration, setEpisodeDuration] = useState<number | ''>(anime.episode_duration_minutes ?? '');
  const [rating, setRating] = useState<number | ''>(anime.rating ?? '');
  const [language, setLanguage] = useState(anime.language ?? 'Japanese');
  const [subtitleLanguages, setSubtitleLanguages] = useState(anime.subtitle_languages ?? 'English');
  const [dubAvailable, setDubAvailable] = useState(anime.dub_available);
  const [featured, setFeatured] = useState(anime.featured);
  const [trending, setTrending] = useState(anime.trending);
  const [publishStatus, setPublishStatus] = useState<AnimePublishStatus>(anime.publish_status);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [posterSlot, setPosterSlot] = useState<{ file: File | null; previewUrl: string | null }>({ file: null, previewUrl: anime.poster_url ?? null });
  const [bannerSlot, setBannerSlot] = useState<{ file: File | null; previewUrl: string | null }>({ file: null, previewUrl: anime.banner_url ?? null });
  const [trailerSlot, setTrailerSlot] = useState<{ file: File | null; previewUrl: string | null }>({ file: null, previewUrl: anime.trailer_url ?? null });

  useEffect(() => {
    fetchAnimeGenresAdmin(anime.id).then(setSelectedGenres).catch(() => {});
  }, [anime.id]);

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const replaceAndDelete = async (bucket: 'posters' | 'banners' | 'trailers', newFile: File | null, oldUrl: string | null): Promise<string | null> => {
    if (!newFile) return oldUrl;
    const { publicUrl } = await uploadFile(bucket, newFile);
    if (oldUrl) {
      const oldPath = extractStoragePath(oldUrl);
      if (oldPath) { try { await deleteFile(bucket, oldPath); } catch { /* best-effort */ } }
    }
    return publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: Partial<Anime> = {
        title,
        original_title: originalTitle || null,
        synopsis: synopsis || null,
        studio: studio || null,
        director: director || null,
        release_date: releaseDate || null,
        status,
        type,
        episode_count: episodeCount || 0,
        season_count: seasonCount || 1,
        episode_duration_minutes: typeof episodeDuration === 'number' ? episodeDuration : null,
        rating: typeof rating === 'number' ? rating : 0,
        language,
        subtitle_languages: subtitleLanguages,
        dub_available: dubAvailable,
        featured,
        trending,
        publish_status: publishStatus,
      };

      patch.poster_url = await replaceAndDelete('posters', posterSlot.file, anime.poster_url);
      patch.banner_url = await replaceAndDelete('banners', bannerSlot.file, anime.banner_url);
      patch.trailer_url = await replaceAndDelete('trailers', trailerSlot.file, anime.trailer_url);

      await setAnimeGenres(anime.id, selectedGenres);
      await onSave(patch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink-border bg-ink-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Edit Anime</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            <X className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-300">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Original Title</label>
            <input value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Studio</label>
            <input value={studio} onChange={(e) => setStudio(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Director</label>
            <input value={director} onChange={(e) => setDirector(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Release Date</label>
            <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-neutral-300">Synopsis</label>
            <textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} rows={3} className="input-field resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as AnimeStatus)} className="input-field">
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as AnimeType)} className="input-field">
              <option value="series">Series</option>
              <option value="movie">Movie</option>
              <option value="ova">OVA</option>
              <option value="special">Special</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Episodes</label>
            <input type="number" value={episodeCount} onChange={(e) => setEpisodeCount(e.target.value ? Number(e.target.value) : '')} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Seasons</label>
            <input type="number" value={seasonCount} onChange={(e) => setSeasonCount(e.target.value ? Number(e.target.value) : '')} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Ep Duration (min)</label>
            <input type="number" value={episodeDuration} onChange={(e) => setEpisodeDuration(e.target.value ? Number(e.target.value) : '')} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Rating</label>
            <input type="number" step="0.1" value={rating} onChange={(e) => setRating(e.target.value ? Number(e.target.value) : '')} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Language</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Subtitles</label>
            <input value={subtitleLanguages} onChange={(e) => setSubtitleLanguages(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Publish Status</label>
            <select value={publishStatus} onChange={(e) => setPublishStatus(e.target.value as AnimePublishStatus)} className="input-field">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={dubAvailable} onChange={(e) => setDubAvailable(e.target.checked)} className="h-5 w-5 accent-primary" />
            <span className="text-sm text-neutral-300">Dub Available</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-5 w-5 accent-primary" />
            <span className="text-sm text-neutral-300">Featured</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} className="h-5 w-5 accent-primary" />
            <span className="text-sm text-neutral-300">Trending</span>
          </label>
        </div>

        {/* Genres */}
        <div className="mt-4">
          <label className="mb-2 block text-sm text-neutral-300">Genres</label>
          <div className="flex flex-wrap gap-2">
            {ANIME_GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selectedGenres.includes(g) ? 'border-primary bg-primary/10 text-primary' : 'border-ink-border text-neutral-400 hover:bg-white/5'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Media */}
        <div className="mt-6 border-t border-ink-border pt-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-neutral-500">Media</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FileUpload
              label="Poster Image"
              accept="image/*"
              hint="Replace poster (optional)"
              previewUrl={posterSlot.previewUrl}
              previewType="image"
              onFileSelected={(file) => {
                if (file) { const url = URL.createObjectURL(file); setPosterSlot({ file, previewUrl: url }); }
                else { setPosterSlot({ file: null, previewUrl: anime.poster_url ?? null }); }
              }}
            />
            <FileUpload
              label="Banner Image"
              accept="image/*"
              hint="Replace banner (optional)"
              previewUrl={bannerSlot.previewUrl}
              previewType="image"
              onFileSelected={(file) => {
                if (file) { const url = URL.createObjectURL(file); setBannerSlot({ file, previewUrl: url }); }
                else { setBannerSlot({ file: null, previewUrl: anime.banner_url ?? null }); }
              }}
            />
            <FileUpload
              label="Trailer (optional)"
              accept="video/mp4,video/webm,video/*"
              hint="Replace trailer (optional)"
              previewUrl={trailerSlot.previewUrl}
              previewType="video"
              onFileSelected={(file) => {
                if (file) { const url = URL.createObjectURL(file); setTrailerSlot({ file, previewUrl: url }); }
                else { setTrailerSlot({ file: null, previewUrl: anime.trailer_url ?? null }); }
              }}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Save Changes</>}
          </button>
          <button onClick={onClose} className="btn-outline">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}
