import { forwardRef, useEffect, useImperativeHandle, useRef, type VideoHTMLAttributes } from 'react';

/**
 * <video> com suporte a HLS (.m3u8): nativo no Safari/iOS, hls.js nos outros navegadores.
 * hls.js só é baixado quando a URL é HLS, então MP4 não paga esse custo.
 */
export const Video = forwardRef<HTMLVideoElement, VideoHTMLAttributes<HTMLVideoElement> & { src: string; startAt?: number }>(
  ({ src, startAt = 0, ...props }, ref) => {
    const el = useRef<HTMLVideoElement>(null);
    useImperativeHandle(ref, () => el.current!);

    useEffect(() => {
      const video = el.current;
      if (!video) return;
      let destroy: (() => void) | undefined;
      const seek = () => { if (startAt > 0 && startAt < (video.duration || Infinity)) video.currentTime = startAt; };
      video.addEventListener('loadedmetadata', seek, { once: true });

      if (/\.m3u8($|\?)/i.test(src) && !video.canPlayType('application/vnd.apple.mpegurl')) {
        let cancelled = false;
        import('hls.js').then(({ default: Hls }) => {
          if (cancelled || !Hls.isSupported()) return;
          const hls = new Hls({ maxBufferLength: 20 });
          hls.loadSource(src);
          hls.attachMedia(video);
          destroy = () => hls.destroy();
        });
        return () => { cancelled = true; destroy?.(); video.removeEventListener('loadedmetadata', seek); };
      }
      video.src = src;
      return () => { video.removeEventListener('loadedmetadata', seek); video.removeAttribute('src'); video.load(); };
    }, [src, startAt]);

    return <video ref={el} playsInline preload="auto" {...props} />;
  }
);
Video.displayName = 'Video';
