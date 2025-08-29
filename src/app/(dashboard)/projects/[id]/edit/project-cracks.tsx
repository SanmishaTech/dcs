"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { apiGet, apiUpload } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import { PERMISSIONS } from '@/config/roles';
import { toast } from '@/lib/toast';
import { AppCard } from '@/components/common/app-card';
import { AppButton } from '@/components/common/app-button';
import { UploadInput } from '@/components/common/upload-input';
import { useForm, FormProvider } from 'react-hook-form';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Crack {
  id: number;
  block: { id: number; name: string } | null;
  chainageFrom: string | null;
  chainageTo: string | null;  
  rl: string | null;  
  defectType: string | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  startTime: string | null;
  endTime: string | null;
  videoFileName?: string | null;
}

export function ProjectCracks({ projectId }: { projectId: number }) {
  const [rows, setRows] = useState<Crack[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoStart, setVideoStart] = useState<string | null>(null);
  const [videoEnd, setVideoEnd] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Parse start time string (supports HH:MM:SS, MM:SS, SS, decimal seconds, optional AM/PM ignored)
  const parseStartTime = (val: string | null): number | null => {
    if (!val) return null;
    const trimmed = val.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed); // plain seconds
    const clean = trimmed.replace(/\b(AM|PM)\b/i, '').trim();
    if (!clean.includes(':')) return null;
    const parts = clean.split(':').map(p => p.trim()).filter(Boolean);
    if (parts.some(p => !/^\d+(\.\d+)?$/.test(p))) return null;
    let secs = 0;
    if (parts.length === 3) { const [h,m,s] = parts; secs = parseInt(h)*3600 + parseInt(m)*60 + parseFloat(s); }
    else if (parts.length === 2) { const [m,s] = parts; secs = parseInt(m)*60 + parseFloat(s); }
    else if (parts.length === 1) { secs = parseFloat(parts[0]); }
    return isFinite(secs) ? secs : null;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pageSize = 100;
      let page = 1;
      let all: Crack[] = [];
      let total = 0;
      while (true) {
        const sp = new URLSearchParams();
        sp.set('projectId', String(projectId));
        sp.set('page', String(page));
        sp.set('pageSize', String(pageSize));
        const resp = await apiGet<{ items: Crack[]; total: number; page: number; pageSize: number }>(`/api/cracks?${sp.toString()}`);
        all = all.concat(resp.items);
        total = resp.total;
        if (all.length >= total || resp.items.length === 0) break;
        page++;
      }
      setRows(all);
      const names = Array.from(new Set(all.map(r => r.block?.name || 'Unknown')));
      setOpenGroups(names);
    } catch {
      toast.error('Failed to load cracks');
    } finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { load(); }, [load]);

  async function handleImport() {
    if (!file) { toast.error('Choose a file first'); return; }
    setImporting(true);
    try {
      const form = new FormData(); form.append('file', file);
      const res = await apiUpload<{ imported: number; errors: unknown[] }>(`/api/cracks?projectId=${projectId}`, form);
      toast.success(`Imported ${res.imported}`);
      load();
                <VideoTimeMeta start={videoStart} end={rows.find(r=>r.videoFileName===videoFile)?.endTime || null} parse={parseStartTime} />
    } catch (e) { toast.error((e as Error).message || 'Import failed'); } finally { setImporting(false); }
  }
  // column headers (static)
  const headers = [
    'Chainage',
    'RL',
    'Defect',
    'L (mm)',
    'W (mm)',
    'H (mm)',
    'Total',
    'Video'
  ];

  const formatNum = (v: number | null | undefined) => {
    if (v == null) return '';
    return Number.isInteger(v) ? v : v.toFixed(2).replace(/\.00$/, '');
  };
  const calcTotal = (l: number | null | undefined, w: number | null | undefined, h: number | null | undefined) => {
    if (l == null) return null;
    if (w == null) return l; // =(L)
    if (h == null) return l * w; // =(L*W)
    return l * w * h; // =(L*W*H)
  };

  const groups = useMemo(() => {
    const map: Record<string, Crack[]> = {};
    for (const r of rows) {
      const key = r.block?.name || 'Unknown';
      (map[key] ||= []).push(r);
    }
    return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]));
  }, [rows]);

  // Accordion manages open state via value prop; expand/collapse all handled separately.

  const form = useForm<{ importFile: File | null }>({ defaultValues: { importFile: null } });
  const { can } = usePermissions();
  const canImport = can(PERMISSIONS.EDIT_PROJECT) || can(PERMISSIONS.IMPORT_CRACKS);

  return (
    <AppCard>
      <AppCard.Header>
        <AppCard.Title>Crack Identifications</AppCard.Title>
        <AppCard.Description>Imported crack data for this project.</AppCard.Description>
        <AppCard.Action>
          {canImport && (
            <FormProvider {...form}>
              <form className='flex items-center gap-2' onSubmit={e => { e.preventDefault(); handleImport(); }}>
                <UploadInput control={form.control} name='importFile' label='' description='' accept='.xlsx,.xls,.csv' onFileChange={f => setFile(f)} itemClassName='m-0' className='m-0' allowClear />
                <AppButton size='sm' variant='secondary' type='submit' disabled={!file || importing}>{importing? 'Importing...' : 'Import'}</AppButton>
                <AppButton size='sm' variant='ghost' type='button' onClick={load} disabled={loading}>{loading? 'Loading...' : 'Refresh'}</AppButton>
              </form>
            </FormProvider>
          )}
        </AppCard.Action>
      </AppCard.Header>
      <AppCard.Content>
        <div className="flex justify-end gap-2 mb-2">
          <AppButton size="sm" variant="ghost" onClick={()=>setOpenGroups(groups.map(g=>g[0]))}>Expand All</AppButton>
          <AppButton size="sm" variant="ghost" onClick={()=>setOpenGroups([])}>Collapse All</AppButton>
        </div>
        <Accordion type="multiple" value={openGroups} onValueChange={(v)=>setOpenGroups(v as string[])} className="space-y-2">
          {groups.map(([blockName, items]) => {
            const totals = items.reduce((acc, r) => {
              const t = calcTotal(r.lengthMm, r.widthMm, r.heightMm);
              if (t != null) acc.total += t;
              if (r.lengthMm) acc.l += r.lengthMm;
              if (r.widthMm) acc.w += r.widthMm;
              if (r.heightMm) acc.h += r.heightMm;
              return acc;
            }, { l:0, w:0, h:0, total:0 });
            return (
              <AccordionItem key={blockName} value={blockName} className="border rounded">
                <AccordionTrigger className="px-3 py-2 text-sm">
                  <div className="flex-1 flex items-center justify-between">
                    <span>{blockName} <span className="text-xs text-muted-foreground">({items.length})</span></span>
                    <span className="text-xs text-muted-foreground ml-4">Σ Total: {formatNum(totals.total)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          {headers.map(h => (
                            <th key={h} className="px-2 py-1 text-left font-medium border-b text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(r => {
                          const chainage = [r.chainageFrom, r.chainageTo].filter(Boolean).join(' - ');
                          const total = calcTotal(r.lengthMm, r.widthMm, r.heightMm);
                          const showView = !!(r.defectType && r.videoFileName);
                          const onView = () => {
                            if (r.videoFileName) {
                              setVideoFile(r.videoFileName);
                              setVideoStart(r.startTime || null);
                              setVideoEnd(r.endTime || null);
                              setVideoOpen(true);
                            }
                          };
                          return (
                            <tr key={r.id} className="hover:bg-muted/30">
                              <td className="px-2 py-1 whitespace-nowrap align-top leading-tight">{chainage}</td>
                              <td className="px-2 py-1 text-right tabular-nums align-top leading-tight">{r.rl ?? ''}</td>
                              <td className="px-2 py-1 whitespace-nowrap align-top leading-tight">{r.defectType ?? ''}</td>
                              <td className="px-2 py-1 text-right tabular-nums align-top leading-tight">{formatNum(r.lengthMm)}</td>
                              <td className="px-2 py-1 text-right tabular-nums align-top leading-tight">{formatNum(r.widthMm)}</td>
                              <td className="px-2 py-1 text-right tabular-nums align-top leading-tight">{formatNum(r.heightMm)}</td>
                              <td className="px-2 py-1 text-right tabular-nums font-medium align-top leading-tight">{formatNum(total)}</td>
                              <td className="px-2 py-1 text-center align-top leading-tight">
                                {showView ? (
                                  <AppButton size='sm' variant='secondary' type='button' onClick={onView}>View</AppButton>
                                ) : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 text-xs md:text-sm font-medium">
                          <td className="px-2 py-1 text-right" colSpan={4}>Block Totals:</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatNum(totals.l)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatNum(totals.w)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatNum(totals.h)}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{formatNum(totals.total)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        {!rows.length && !loading && <div className='text-sm text-muted-foreground'>No cracks found.</div>}
  <Dialog open={videoOpen} onOpenChange={(o)=>{ if(!o) { setVideoOpen(false); setVideoFile(null); setVideoStart(null); setVideoEnd(null);} }}>
          <DialogContent className='max-w-3xl'>
            <DialogHeader>
              <DialogTitle>Video Preview</DialogTitle>
            </DialogHeader>
            {videoFile ? (
              <div className='space-y-2'>
                <video
                  key={videoFile + (videoStart || '')}
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  className='w-full max-h-[70vh] rounded border'
                  onLoadedMetadata={() => {
                    const secs = parseStartTime(videoStart);
                    if (secs && videoRef.current) {
                      try { videoRef.current.currentTime = secs; } catch { /* ignore */ }
                    }
                  }}
                  onTimeUpdate={() => {
                    const endSecs = parseStartTime(videoEnd);
                    if (!endSecs || !videoRef.current) return;
                    if (videoRef.current.currentTime >= endSecs) {
                      try {
                        videoRef.current.currentTime = endSecs;
                        videoRef.current.pause();
                      } catch { /* ignore */ }
                    }
                  }}
                >
                  <source src={`/projects/${projectId}/videos/${encodeURIComponent(videoFile)}`} />
                  Your browser does not support the video tag.
                </video>
                <VideoTimeMeta start={videoStart} end={videoEnd} parse={parseStartTime} />
                <div className='text-xs text-muted-foreground break-all'>{videoFile}</div>
              </div>
            ) : <div className='text-sm text-muted-foreground'>No video selected.</div>}
          </DialogContent>
        </Dialog>
      </AppCard.Content>
    </AppCard>
  );
}

// Seeking handled directly in onReady of ReactPlayer.
function VideoTimeMeta({ start, end, parse }: { start: string | null; end: string | null; parse: (v: string | null) => number | null }) {
  const s = parse(start);
  const e = parse(end);
  let duration: number | null = null;
  if (s != null && e != null && e >= s) duration = e - s;
  const fmt = (sec: number | null) => {
    if (sec == null) return '-';
    if (sec < 60) return sec.toFixed(1).replace(/\.0$/, '') + 's';
    const h = Math.floor(sec/3600);
    const m = Math.floor((sec%3600)/60);
    const sRem = Math.floor(sec%60);
    const base = [h>0?String(h).padStart(2,'0'):null, String(m).padStart(2,'0'), String(sRem).padStart(2,'0')].filter(Boolean).join(':');
    return base;
  };
  return (
    <div className='text-xs text-muted-foreground flex gap-4 flex-wrap'>
      <span><span className='font-medium'>Start:</span> {start || '-' } {s!=null && <span className='text-[10px] ml-1'>({fmt(s)})</span>}</span>
      <span><span className='font-medium'>End:</span> {end || '-' } {e!=null && <span className='text-[10px] ml-1'>({fmt(e)})</span>}</span>
      <span><span className='font-medium'>Duration:</span> {duration!=null ? fmt(duration) : '-'}</span>
    </div>
  );
}
