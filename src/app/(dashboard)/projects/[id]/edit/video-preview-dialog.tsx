"use client";
import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface CrackInfo {
  id: number;
  blockName?: string | null;
  chainageFrom?: string | null;
  chainageTo?: string | null;
  rl?: string | number | null;
  defectType?: string | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  videoFileName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

function parseStartTime(val: string | null | undefined): number | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
  const clean = trimmed.replace(/\b(AM|PM)\b/i, '').trim();
  if (!clean.includes(':')) return null;
  const parts = clean.split(':').map(p => p.trim()).filter(Boolean);
  if (parts.some(p => !/^\d+(\.\d+)?$/.test(p))) return null;
  let secs = 0;
  if (parts.length === 3) { const [h,m,s] = parts; secs = parseInt(h)*3600 + parseInt(m)*60 + parseFloat(s); }
  else if (parts.length === 2) { const [m,s] = parts; secs = parseInt(m)*60 + parseFloat(s); }
  else if (parts.length === 1) { secs = parseFloat(parts[0]); }
  return isFinite(secs) ? secs : null;
}

const fmtNum = (v: number | null | undefined) => {
  if (v == null) return '';
  return Number.isInteger(v) ? String(v) : (v as number).toFixed(2).replace(/\.00$/, '');
};

export function VideoPreviewDialog({
  open,
  onOpenChange,
  projectId,
  crack,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  crack: CrackInfo | null;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startSecs = parseStartTime(crack?.startTime || null);
  const endSecs = parseStartTime(crack?.endTime || null);

  const dims = [fmtNum(crack?.lengthMm ?? null), fmtNum(crack?.widthMm ?? null), fmtNum(crack?.heightMm ?? null)]
    .filter(Boolean)
    .join('×');
  const chainage = [crack?.chainageFrom, crack?.chainageTo].filter(Boolean).join(' - ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Video Preview</DialogTitle>
        </DialogHeader>
        {crack?.videoFileName ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div><span className="font-medium">Crack ID:</span> #{crack.id}</div>
              <div><span className="font-medium">Block:</span> {crack.blockName || '-'}</div>
              <div><span className="font-medium">Chainage:</span> {chainage || '-'}</div>
              <div><span className="font-medium">RL:</span> {crack?.rl ?? '-'}</div>
              <div><span className="font-medium">Defect:</span> {crack?.defectType || '-'}</div>
              <div><span className="font-medium">Dimensions:</span> {dims ? `${dims} mm` : '-'}</div>
            </div>
            <video
              key={crack.videoFileName + (crack.startTime || '')}
              ref={videoRef}
              controls
              autoPlay
              playsInline
              className="w-full max-h-[70vh] rounded border"
              onLoadedMetadata={() => {
                if (startSecs && videoRef.current) {
                  try { videoRef.current.currentTime = startSecs; } catch { /* ignore */ }
                }
              }}
              onTimeUpdate={() => {
                if (!endSecs || !videoRef.current) return;
                if (videoRef.current.currentTime >= endSecs) {
                  try {
                    videoRef.current.currentTime = endSecs;
                    videoRef.current.pause();
                  } catch { /* ignore */ }
                }
              }}
            >
              <source src={`/projects/${projectId}/videos/${encodeURIComponent(crack.videoFileName)}`} />
              Your browser does not support the video tag.
            </video>
            <div className="text-xs text-muted-foreground flex gap-4 flex-wrap">
              <span><span className="font-medium">Start:</span> {crack?.startTime || '-'}</span>
              <span><span className="font-medium">End:</span> {crack?.endTime || '-'}</span>
              <span><span className="font-medium">File:</span> {crack?.videoFileName || '-'}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No video selected.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default VideoPreviewDialog;
