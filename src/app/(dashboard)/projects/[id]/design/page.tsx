"use client";
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useState, useRef, useCallback, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { apiGet } from '@/lib/api-client';
import { AppCard } from '@/components/common/app-card';
import { AppButton } from '@/components/common/app-button';

interface ProjectDetail { id: number; name: string; designImage?: string | null; }

export default function ProjectDesignPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data, error, isLoading } = useSWR<ProjectDetail>(projectId ? `/api/projects/${projectId}` : null, apiGet);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const src = data?.designImage ? `/uploads/projects/${projectId}/designs/${data.designImage}` : null;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
  };

  const computeFit = useCallback(() => {
    if (!containerRef.current || !natural) return 1;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const scale = Math.min(cw / natural.w, ch / natural.h);
    return scale || 1;
  }, [natural]);

  const invalidId = !projectId;
  // refs for transform actions injected by TransformWrapper context
  const actionsRef = useRef<{ zoomIn: () => void; zoomOut: () => void; resetTransform: () => void; setTransform: (x:number,y:number,scale:number,duration?:number,ease?:string)=>void } | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!actionsRef.current) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) return;
      const { zoomIn, zoomOut, resetTransform, setTransform } = actionsRef.current;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
      else if (e.key === '-') { e.preventDefault(); zoomOut(); }
      else if (e.key === '0') { e.preventDefault(); resetTransform(); }
      else if (e.key.toLowerCase() === 'f') { e.preventDefault(); const s = computeFit(); if (containerRef.current && natural) { const cw = containerRef.current.clientWidth; const ch = containerRef.current.clientHeight; const dx = (cw - natural.w * s) / 2; const dy = (ch - natural.h * s) / 2; setTransform(dx, dy, s, 150, 'easeOut'); } else setTransform(0, 0, s, 150, 'easeOut'); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [computeFit, natural]);

  if (invalidId) return <div className='p-6'>Invalid project id</div>;
  if (error) return <div className='p-6 text-destructive'>Failed to load project</div>;

  return (
    <AppCard className='mt-4'>
      <AppCard.Header>
        <AppCard.Title>Design - {data?.name || '...'}</AppCard.Title>
        <AppCard.Description>Zoom & pan the project design image.</AppCard.Description>
      </AppCard.Header>
      <AppCard.Content className='space-y-3'>
        {isLoading && <div className='text-sm text-muted-foreground'>Loading...</div>}
        {!isLoading && !src && <div className='text-sm text-muted-foreground'>No design image uploaded.</div>}
        {src && (
          <div className='flex flex-col gap-2'>
            <TransformWrapper
              minScale={0.05}
              limitToBounds={false}
              centerOnInit={false}
              doubleClick={{ disabled: true }}
              wheel={{ step: 0.15 }}
            >
              {({ zoomIn, zoomOut, resetTransform, setTransform, ...rest }) => {
                // Update actionsRef each render of render-prop with latest functions
                actionsRef.current = { zoomIn, zoomOut, resetTransform, setTransform };
                return (<>
                  <div className='flex flex-wrap gap-2 items-center mb-1'>
                    <AppButton size='sm' type='button' onClick={() => zoomIn()} iconName='ZoomIn'>In</AppButton>
                    <AppButton size='sm' type='button' onClick={() => zoomOut()} iconName='ZoomOut'>Out</AppButton>
                    <AppButton size='sm' type='button' onClick={() => resetTransform()} iconName='RefreshCw'>Reset</AppButton>
                    <AppButton
                      size='sm'
                      type='button'
                      onClick={() => {
                        const s = computeFit();
                        // Center after fit
                        if (containerRef.current && natural) {
                          const cw = containerRef.current.clientWidth;
                          const ch = containerRef.current.clientHeight;
                          const dx = (cw - natural.w * s) / 2;
                          const dy = (ch - natural.h * s) / 2;
                          setTransform(dx, dy, s, 150, 'easeOut');
                        } else {
                          setTransform(0, 0, s, 150, 'easeOut');
                        }
                      }}
                      iconName='Maximize2'
                    >Fit</AppButton>
                    <div className='text-xs text-muted-foreground'>Scale: {rest?.instance?.transformState?.scale?.toFixed(2)}</div>
                    {natural && (
                      <div className='text-xs text-muted-foreground'>Image: {natural.w}×{natural.h}</div>
                    )}
                  </div>
                  <div
                    ref={containerRef}
                    className='relative w-full border rounded bg-muted/30 overflow-hidden'
                    style={{ height: '70vh' }}
                  >
                    <TransformComponent>
                      {/* Using next/image for optimization disabled due to extreme dimensions */}
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt='Design image'
                          onLoad={handleImageLoad}
                          className='select-none pointer-events-none'
                          draggable={false}
                        />
                      </div>
                    </TransformComponent>
                  </div>
                </>);
              }}
            </TransformWrapper>
            <p className='text-xs text-muted-foreground'>Use mouse wheel (Ctrl + wheel for browser zoom avoided) or buttons to zoom. Pan by dragging.</p>
            <p className='text-xs text-muted-foreground'>Shortcuts: + / = zoom in, - zoom out, 0 reset, f fit.</p>
          </div>
        )}
      </AppCard.Content>
    </AppCard>
  );
}
