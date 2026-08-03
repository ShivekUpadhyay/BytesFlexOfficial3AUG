import { getVideoSourceInfo } from '@/lib/utils';

interface EmbedPlayerProps {
  url: string;
  title: string;
  autoPlay?: boolean;
}

export function EmbedPlayer({ url, title, autoPlay = false }: EmbedPlayerProps) {
  const info = getVideoSourceInfo(url);
  if (!info.embedUrl) return null;

  let src = info.embedUrl;
  if (autoPlay) {
    if (info.provider === 'youtube') src += '?autoplay=1&rel=0';
    else if (info.provider === 'vimeo') src += '?autoplay=1';
    else if (info.provider === 'dailymotion') src += '?autoplay=1';
    else if (info.provider === 'streamable') src += '?autoplay=1';
  }

  const allow = [
    'accelerometer',
    'autoplay',
    'clipboard-write',
    'encrypted-media',
    'gyroscope',
    'picture-in-picture',
    'web-share',
    'fullscreen',
  ].join('; ');

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full"
        allow={allow}
        allowFullScreen
      />
    </div>
  );
}
