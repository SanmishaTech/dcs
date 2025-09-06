"use client";
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useState, useRef, useEffect, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { apiGet } from '@/lib/api-client';
import { AppCard } from '@/components/common/app-card';
import { AppButton } from '@/components/common/app-button';

interface ProjectDetail { id: number; name: string; designImage?: string | null; }
interface Crack { id: number; defectType: string | null; blockId: number; }
interface DesignMapRec { id: number; projectId: number; crackIdentificationId: number; x: number; y: number; width: number; height: number; }

const WIDE_ASPECT_THRESHOLD = 4; // if image wider than 4:1, prefer height-based fit

function DesignImageView({
  src,
  onImageLoad,
  natural,
  containerRef,
  overlay,
  mapsCount,
  onNewMap,
  drawing,
  canDraw,
  loadingImage,
}: {
  src: string;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  natural: { w: number; h: number } | null;
  containerRef: React.RefObject<HTMLDivElement>;
  overlay?: React.ReactNode;
  mapsCount: number;
  onNewMap: () => void;
  drawing: boolean;
  canDraw: boolean;
  loadingImage: boolean;
}) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [scale, setScale] = useState(1);

  const computeFit = useCallback(() => {
    if (!containerRef.current || !natural) return 1;
    const ch = containerRef.current.clientHeight;
    return (ch / natural.h) || 1;
  }, [natural, containerRef]);

  const applyFit = useCallback(() => {
    if (!transformRef.current || !containerRef.current || !natural) return;
    const { setTransform } = transformRef.current;
    const s = computeFit();
    const cw = containerRef.current.clientWidth;
    const dx = (cw - natural.w * s) / 2;
    setTransform(dx, 0, s, 150, 'easeOut');
  }, [computeFit, containerRef, natural]);

  const handleReset = useCallback(() => {
    if (!transformRef.current) return;
    transformRef.current.setTransform(0, 0, 20, 150, 'easeOut');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!transformRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) return;
      const { zoomIn, zoomOut } = transformRef.current;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(0.2); }
      else if (e.key === '-') { e.preventDefault(); zoomOut(0.2); }
      else if (e.key === '0' || e.key.toLowerCase() === 'f') { e.preventDefault(); applyFit(); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [applyFit]);

  const containerHeight = natural
    ? (natural.w / natural.h > WIDE_ASPECT_THRESHOLD ? '90vh' : '70vh')
    : '75vh';

  return (
    <>
      <div className='flex flex-wrap gap-2 items-center mb-1'>
        <AppButton size='sm' type='button' onClick={() => transformRef.current?.zoomIn(0.2)} iconName='ZoomIn'>In</AppButton>
        <AppButton size='sm' type='button' onClick={() => transformRef.current?.zoomOut(0.2)} iconName='ZoomOut'>Out</AppButton>
        <AppButton size='sm' type='button' onClick={handleReset} iconName='RefreshCcw'>Reset</AppButton>
  <AppButton size='sm' type='button' onClick={onNewMap} iconName='Square' disabled={!canDraw}>New Map</AppButton>
        <div className='text-xs text-muted-foreground'>Scale: {scale.toFixed(2)}</div>
        {natural && (
          <div className='text-xs text-muted-foreground'>Image: {natural.w}×{natural.h}</div>
        )}
        <div className='text-xs text-muted-foreground'>Maps: {mapsCount}</div>
        {drawing && <div className='text-xs text-amber-600'>Drawing… drag on image</div>}
        {!natural && loadingImage && <div className='text-xs text-muted-foreground'>Loading image…</div>}
      </div>
      <div
        ref={containerRef}
        className='relative w-full border rounded bg-muted/30 overflow-hidden'
        style={{ height: containerHeight }}
      >
        <TransformWrapper
          ref={transformRef}
          minScale={0.005}
          maxScale={30}
          limitToBounds={true}
          disablePadding={false}
          doubleClick={{ disabled: true }}
          wheel={{ step: 0.2 }}
          // Disable panning while drawing a new map to prevent image from moving
          panning={{ disabled: drawing }}
          initialScale={20}
          initialPositionX={0}
          initialPositionY={0}
          alignmentAnimation={{ disabled:false }}
          onTransformed={(_ref, state) => setScale(state.scale)}
        >
          <TransformComponent wrapperClass="!h-full" contentClass="!h-full">
            <div className="relative h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt='Design image'
                onLoad={onImageLoad}
                className='select-none pointer-events-none'
                draggable={false}
              />
              {overlay}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>
    </>
  );
}

export default function ProjectDesignPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data, error, isLoading } = useSWR<ProjectDetail>(projectId ? `/api/projects/${projectId}` : null, apiGet);
  const { data: cracksData } = useSWR<{ items: Crack[] }>(projectId ? `/api/cracks?projectId=${projectId}&page=1&pageSize=100` : null, apiGet);
  const { data: designMapsData, mutate: mutateMaps } = useSWR<{ items: DesignMapRec[] }>(projectId ? `/api/design-maps?projectId=${projectId}` : null, apiGet);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const src = data?.designImage ? `/uploads/projects/${projectId}/designs/${data.designImage}` : null;
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState<{x:number;y:number}|null>(null);
  const [draftRect, setDraftRect] = useState<{x:number;y:number;width:number;height:number}|null>(null);
  const [pendingRect, setPendingRect] = useState<{x:number;y:number;width:number;height:number}|null>(null);
  const [selectedCrackId, setSelectedCrackId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const designMaps = designMapsData?.items || [];
  const cracks = cracksData?.items || [];

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!drawing || !natural) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scale = rect.width / natural.w || 1;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setStartPt({ x, y });
    setDraftRect(null);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawing || !natural || !startPt) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scale = rect.width / natural.w || 1;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const rx = Math.min(startPt.x, x);
    const ry = Math.min(startPt.y, y);
    const rw = Math.abs(x - startPt.x);
    const rh = Math.abs(y - startPt.y);
    setDraftRect({ x: rx, y: ry, width: rw, height: rh });
  };
  const handlePointerUp = () => {
    if (!drawing || !draftRect) { setStartPt(null); return; }
    setPendingRect(draftRect);
    setDrawing(false);
    setStartPt(null);
  };

  const cancelPending = () => { setPendingRect(null); setDraftRect(null); setSelectedCrackId(''); };
  const savePending = async () => {
    if (!pendingRect || !natural || !selectedCrackId) return;
    setSaving(true);
    try {
      // Normalize to natural image coords (currently already in image pixel space)
      const payload = {
        projectId,
        crackIdentificationId: selectedCrackId,
        x: Number(pendingRect.x.toFixed(2)),
        y: Number(pendingRect.y.toFixed(2)),
        width: Number(pendingRect.width.toFixed(2)),
        height: Number(pendingRect.height.toFixed(2)),
      };
      const res = await fetch('/api/design-maps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        console.error('Failed to save design map');
      } else {
        await mutateMaps();
        cancelPending();
      }
    } finally { setSaving(false); }
  };

  // Keyboard shortcut: ESC to cancel drawing or pending rectangle
  useEffect(() => {
    function keyHandler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (drawing) { setDrawing(false); setDraftRect(null); }
        else if (pendingRect) { cancelPending(); }
      }
    }
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [drawing, pendingRect]);

  const overlay = natural && (
    <div
      className="absolute top-0 left-0"
  style={{ width: natural.w, height: natural.h }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Existing maps (single consistent color) */}
      {designMaps.map(m => {
        // Adaptive fallback: if any stored dimension exceeds natural bounds by >1.5x, treat as legacy scaled coords and compress.
        let { x, y, width, height } = m;
        const overScale = Math.max(width / natural.w, height / natural.h, x / natural.w, y / natural.h);
        if (overScale > 1.5) {
          // heuristic: divide by round(overScale) to bring into view (limit 50 to avoid extremes)
            const factor = Math.min(50, Math.round(overScale));
            x = x / factor; y = y / factor; width = width / factor; height = height / factor;
        }
        if (width <= 0 || height <= 0) return null;
        return (
          <div
            key={m.id}
            className="absolute overflow-visible z-30"
            style={{ left:x, top:y, width, height, border:'1px solid rgba(234,179,8,0.8)', backgroundColor:'rgba(254,240,138,0.35)' }}
          >
            <div className="absolute left-0 top-0 px-0.5 py-[1px] text-[9px] leading-none text-white/90 bg-blue-500/80 select-none">#{m.id}</div>
          </div>
        );
      })}
      {/* Draft rectangle while dragging */}
      {draftRect && (
        <div
          className="absolute"
          style={{ left:draftRect.x, top:draftRect.y, width:draftRect.width, height:draftRect.height, border:'1px solid rgba(234,179,8,0.9)', backgroundColor:'rgba(254,240,138,0.45)' }}
        />
      )}
    </div>
  );

  if (!projectId) return <div className='p-6'>Invalid project id</div>;
  if (error) return <div className='p-6 text-destructive'>Failed to load project</div>;

  return (
    <AppCard className='mt-4'>
      <AppCard.Header>
        <AppCard.Title>Design - {data?.name || '...'}</AppCard.Title>
        <AppCard.Description>Zoom & pan the project design image.</AppCard.Description>
      </AppCard.Header>
      <AppCard.Content className='space-y-3'>
        {isLoading && <div className='text-sm text-muted-foreground'>Loading...</div>}
        {!isLoading && !src && (
          <div className='text-sm text-muted-foreground'>No design image uploaded. Upload a design image in project edit to enable mapping.</div>
        )}
        {src && (
          <div className='flex flex-col gap-2'>
            <DesignImageView
              src={src}
              onImageLoad={handleImageLoad}
              natural={natural}
              containerRef={containerRef}
              overlay={overlay}
              mapsCount={designMaps.length}
              onNewMap={() => { cancelPending(); setDrawing(true); }}
              drawing={drawing}
              canDraw={!drawing && !!src && !!natural}
              loadingImage={!!src && !natural}
            />
            {pendingRect && (
              <div className='mt-2 p-2 border rounded bg-muted/30 space-y-2'>
                <div className='text-sm font-medium'>New Design Map</div>
                <div className='grid gap-2 md:grid-cols-2 text-xs'>
                  <div>Position: ({pendingRect.x.toFixed(1)}, {pendingRect.y.toFixed(1)})</div>
                  <div>Size: {pendingRect.width.toFixed(1)} × {pendingRect.height.toFixed(1)}</div>
                </div>
                <div className='flex items-center gap-2'>
                  <select className='border rounded px-2 py-1 text-sm' value={selectedCrackId} onChange={e => setSelectedCrackId(e.target.value ? Number(e.target.value) : '')}>
                    <option value=''>Select Crack</option>
                    {cracks.slice(0,200).map(c => (
                      <option key={c.id} value={c.id}>#{c.id} {c.defectType || '—'}</option>
                    ))}
                  </select>
                  <AppButton size='sm' type='button' onClick={savePending} disabled={!selectedCrackId || saving} iconName='Save'>Save</AppButton>
                  <AppButton size='sm' type='button' variant='outline' onClick={cancelPending} disabled={saving}>Cancel</AppButton>
                </div>
                {!cracks.length && <div className='text-xs text-muted-foreground'>No cracks loaded to associate.</div>}
              </div>
            )}
            {/* Editing UI removed */}
            <p className='text-xs text-muted-foreground'>Use mouse wheel (Ctrl + wheel for browser zoom avoided) or buttons to zoom. Pan by dragging.</p>
            <p className='text-xs text-muted-foreground'>Shortcuts: + / = zoom in, - zoom out, 0 reset, f fit.</p>
          </div>
        )}
      </AppCard.Content>
    </AppCard>
  );
}
