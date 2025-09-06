"use client";
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useState, useRef, useEffect, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { apiGet } from '@/lib/api-client';
import { AppCard } from '@/components/common/app-card';
import { AppButton } from '@/components/common/app-button';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProjectDetail { id: number; name: string; designImage?: string | null; }
interface Crack { id: number; defectType: string | null; blockId: number; }
interface Block { id: number; name: string; projectId: number; }
interface DesignMapRec { id: number; projectId: number; crackIdentificationId: number; x: number; y: number; width: number; height: number; }

const WIDE_ASPECT_THRESHOLD = 4; // if image wider than 4:1, prefer height-based fit

function DesignImageView({
  src,
  onImageLoad,
  natural,
  containerRef,
  overlay,
  mapsCount,
  drawing,
  loadingImage,
}: {
  src: string;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  natural: { w: number; h: number } | null;
  containerRef: React.RefObject<HTMLDivElement>;
  overlay?: React.ReactNode;
  mapsCount: number;
  drawing: boolean;
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
  const [blockFilter, setBlockFilter] = useState<number | 'all'>('all');
  const { data: blocks } = useSWR<Block[]>(projectId ? `/api/blocks?projectId=${projectId}` : null, apiGet);
  const cracksKey = projectId ? (() => {
    const sp = new URLSearchParams();
    sp.set('projectId', String(projectId));
    sp.set('page', '1');
    sp.set('pageSize', '100');
    sp.set('excludeMapped', '1');
    if (blockFilter !== 'all') sp.set('blockId', String(blockFilter));
    return `/api/cracks?${sp.toString()}`;
  })() : null;
  const { data: cracksData } = useSWR<{ items: Crack[] }>(cracksKey, apiGet);
  const { data: designMapsData, mutate: mutateMaps } = useSWR<{ items: DesignMapRec[] }>(projectId ? `/api/design-maps?projectId=${projectId}` : null, apiGet);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const src = data?.designImage ? `/uploads/projects/${projectId}/designs/${data.designImage}` : null;
  const [drawing, setDrawing] = useState(false);
  const [startPt, setStartPt] = useState<{x:number;y:number}|null>(null);
  const [draftRect, setDraftRect] = useState<{x:number;y:number;width:number;height:number}|null>(null);
  const [pendingRect, setPendingRect] = useState<{x:number;y:number;width:number;height:number}|null>(null);
  const [selectedCrackId, setSelectedCrackId] = useState<number | ''>('');
  const [menuTarget, setMenuTarget] = useState<{ type: 'map'; id: number } | { type: 'canvas' } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editDialog, setEditDialog] = useState<{ mode: 'create' | 'update'; rect: { x:number;y:number;width:number;height:number }; id?: number; crackId: number | '' } | null>(null);

  const designMaps = designMapsData?.items || [];
  const cracks = cracksData?.items || [];

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // only respond to left click for drawing
    if (e.button !== 0) return;
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
  // open create dialog with the drawn rect
  setEditDialog({ mode: 'create', rect: draftRect, crackId: '' });
  setPendingRect(draftRect);
  setDrawing(false);
  setStartPt(null);
  };

  const cancelPending = () => { setPendingRect(null); setDraftRect(null); setSelectedCrackId(''); };
  const savePending = async () => {
  if (!pendingRect || !natural || !selectedCrackId) return;
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
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.message || 'Failed to create map');
      }
      await mutateMaps();
      toast.success('Map created');
      cancelPending();
      setEditDialog(null);
    } catch (e) {
      toast.error((e as Error).message);
  }
  };

  async function handleDeleteMap(id: number) {
    try {
      const res = await fetch(`/api/design-maps/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.message || 'Delete failed');
      }
      toast.success('Map deleted');
      await mutateMaps();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setMenuTarget(null);
  setConfirmDeleteId(null);
    }
  }

  // Open update dialog from context menu (future enhancement could move/resize)
  function openUpdateDialog(id: number) {
    const m = designMaps.find((d) => d.id === id);
    if (!m) return;
    setEditDialog({ mode: 'update', rect: { x: m.x, y: m.y, width: m.width, height: m.height }, id: m.id, crackId: m.crackIdentificationId });
  }

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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="absolute top-0 left-0"
          style={{ width: natural.w, height: natural.h }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenuCapture={() => setMenuTarget({ type: 'canvas' })}
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
            style={{ left:x, top:y, width, height, backgroundColor:'rgba(254,240,138,0.35)' }}
            onContextMenu={() => { setMenuTarget({ type: 'map', id: m.id }); }}
          />
        );
      })}
      {/* Draft rectangle while dragging */}
      {draftRect && (
        <div
          className="absolute"
          style={{ left:draftRect.x, top:draftRect.y, width:draftRect.width, height:draftRect.height, backgroundColor:'rgba(254,240,138,0.45)' }}
        />
      )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {menuTarget?.type === 'map' ? (
          <>
            <ContextMenuItem onSelect={() => { if (menuTarget?.type==='map') openUpdateDialog(menuTarget.id); setMenuTarget(null); }}>Edit Map</ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              onSelect={() => { setConfirmDeleteId(menuTarget.id); setMenuTarget(null); }}
            >
              Delete Map
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem onSelect={() => { cancelPending(); setDrawing(true); setMenuTarget(null); }}>New Map</ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
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
              drawing={drawing}
              loadingImage={!!src && !natural}
            />
            {/* Editing UI removed */}
            <p className='text-xs text-muted-foreground'>Use mouse wheel (Ctrl + wheel for browser zoom avoided) or buttons to zoom. Pan by dragging.</p>
            <p className='text-xs text-muted-foreground'>Shortcuts: + / = zoom in, - zoom out, 0 reset, f fit.</p>
            <ConfirmDialog
              open={confirmDeleteId != null}
              onOpenChange={(o) => { if (!o) setConfirmDeleteId(null); }}
              title="Delete map?"
              description={confirmDeleteId != null ? `This will permanently remove map #${confirmDeleteId}.` : undefined}
              confirmText="Delete"
              onConfirm={async () => { if (confirmDeleteId != null) await handleDeleteMap(confirmDeleteId); }}
            />

            <Dialog open={!!editDialog} onOpenChange={(o)=>{ if(!o){ setEditDialog(null); } }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editDialog?.mode === 'update' ? 'Update Map' : 'Create Map'}</DialogTitle>
                </DialogHeader>
                <div className='space-y-3'>
                  <div className='grid grid-cols-2 gap-2 text-xs'>
                    <div>Pos: {editDialog?.rect.x.toFixed(1)}, {editDialog?.rect.y.toFixed(1)}</div>
                    <div>Size: {editDialog?.rect.width.toFixed(1)} × {editDialog?.rect.height.toFixed(1)}</div>
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-3 items-center'>
                    <div className='flex items-center gap-2'>
                      <label className='text-sm w-20'>Block</label>
                      <select
                        className='border rounded px-2 py-1 text-sm'
                        value={blockFilter}
                        onChange={(e)=> setBlockFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      >
                        <option value='all'>All</option>
                        {(blocks||[]).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className='flex items-center gap-2'>
                      <label className='text-sm w-20'>Crack</label>
                      <select
                        className='border rounded px-2 py-1 text-sm flex-1'
                        value={editDialog?.crackId ?? ''}
                        onChange={(e)=> setEditDialog((d)=> d ? { ...d, crackId: e.target.value ? Number(e.target.value) : '' } : d)}
                      >
                        <option value=''>Select Crack</option>
                        {/* If updating, ensure current crack stays visible even when excludeMapped is active */}
                        {editDialog?.mode === 'update' && editDialog.crackId && !cracks.find(c=>c.id===editDialog.crackId) && (
                          <option value={editDialog.crackId}>#{editDialog.crackId} (current)</option>
                        )}
                        {cracks.slice(0,200).map(c => (
                          <option key={c.id} value={c.id}>#{c.id} {c.defectType || '—'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <DialogFooter className='mt-4'>
                  <Button variant='outline' size='sm' type='button' onClick={()=> setEditDialog(null)}>Cancel</Button>
                  {editDialog?.mode === 'create' ? (
                    <Button size='sm' type='button' onClick={()=> { if (editDialog?.crackId) { setSelectedCrackId(editDialog.crackId); void savePending(); } }}>Save</Button>
                  ) : (
                    <Button
                      size='sm'
                      type='button'
                      onClick={async ()=> {
                        if (editDialog?.id && editDialog?.crackId) {
                          try {
                            const res = await fetch(`/api/design-maps/${editDialog.id}`, {
                              method:'PATCH',
                              headers:{'Content-Type':'application/json'},
                              body: JSON.stringify({ crackIdentificationId: editDialog.crackId })
                            });
                            if (!res.ok) {
                              const msg = await res.json().catch(() => ({}));
                              throw new Error(msg?.message || 'Failed to update map');
                            }
                            await mutateMaps();
                            toast.success('Map updated');
                            setEditDialog(null);
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }
                      }}
                    >
                      Save
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </AppCard.Content>
    </AppCard>
  );
}
