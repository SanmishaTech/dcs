'use client';
import { useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { apiGet } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { AppCard } from '@/components/common/app-card';
import { AppButton } from '@/components/common/app-button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import VideoPreviewDialog, { type CrackInfo } from './video-preview-dialog';

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

export type ProjectCracksHandle = { reload: () => void };

export const ProjectCracks = forwardRef<ProjectCracksHandle, { projectId: number; embedded?: boolean }>(function ProjectCracks({ projectId, embedded = false }, ref) {
	const [rows, setRows] = useState<Crack[]>([]);
	const [loading, setLoading] = useState(false);
	const [openGroups, setOpenGroups] = useState<string[]>([]);
	const [videoOpen, setVideoOpen] = useState(false);
	const [videoCrack, setVideoCrack] = useState<CrackInfo | null>(null);

	const headers: { key: string; title: string; align: 'left' | 'right' }[] = [
		{ key: 'id', title: 'ID', align: 'left' },
		{ key: 'chainage', title: 'Chainage', align: 'left' },
		{ key: 'rl', title: 'RL', align: 'right' },
		{ key: 'defect', title: 'Defect', align: 'left' },
		{ key: 'dims', title: 'Dimensions (mm)', align: 'right' },
		{ key: 'total', title: 'Total', align: 'right' },
		{ key: 'video', title: 'Video', align: 'right' },
	];

	const formatNum = (v: number | null | undefined) => {
		if (v == null) return '';
		return Number.isInteger(v) ? String(v) : (v as number).toFixed(2).replace(/\.00$/, '');
	};
	const calcTotal = (l: number | null | undefined, w: number | null | undefined, h: number | null | undefined) => {
		if (l == null) return null;
		if (w == null) return l;
		if (h == null) return (l as number) * (w as number);
		return (l as number) * (w as number) * (h as number);
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

	useImperativeHandle(ref, () => ({ reload: () => { void load(); } }), [load]);

	const groups = useMemo(() => {
		const map: Record<string, Crack[]> = {};
		for (const r of rows) {
			const key = r.block?.name || 'Unknown';
			(map[key] ||= []).push(r);
		}
		return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]));
	}, [rows]);

	const content = (
		<>
			<div className="flex justify-end gap-2 mb-2">
				<AppButton size="sm" variant="ghost" onClick={()=>setOpenGroups(groups.map(g=>g[0]))}>Expand All</AppButton>
				<AppButton size="sm" variant="ghost" onClick={()=>setOpenGroups([])}>Collapse All</AppButton>
			</div>
			<Accordion type="multiple" value={openGroups} onValueChange={(v)=>setOpenGroups(v as string[])} className="space-y-2">
				{groups.map(([blockName, items]) => {
					const totals = items.reduce((acc, r) => {
						const t = calcTotal(r.lengthMm, r.widthMm, r.heightMm);
						if (t != null) acc.total += t as number;
						if (r.lengthMm) acc.l += r.lengthMm;
						if (r.widthMm) acc.w += r.widthMm;
						if (r.heightMm) acc.h += r.heightMm;
						return acc;
					}, { l:0, w:0, h:0, total:0 as number });
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
													<th key={h.key} className={`px-2 py-1 ${h.align==='right'?'text-right':'text-left'} font-medium border-b text-muted-foreground whitespace-nowrap`}>{h.title}</th>
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
														setVideoCrack({
															id: r.id,
															blockName: r.block?.name || null,
															chainageFrom: r.chainageFrom,
															chainageTo: r.chainageTo,
															rl: r.rl,
															defectType: r.defectType,
															lengthMm: r.lengthMm,
															widthMm: r.widthMm,
															heightMm: r.heightMm,
															videoFileName: r.videoFileName,
															startTime: r.startTime,
															endTime: r.endTime,
														});
														setVideoOpen(true);
													}
												};
												const dims = [formatNum(r.lengthMm), formatNum(r.widthMm), formatNum(r.heightMm)].filter(Boolean).join('×');
												return (
													<tr key={r.id} className="hover:bg-muted/30">
														<td className="px-2 py-1 text-left tabular-nums align-top leading-tight">#{r.id}</td>
														<td className="px-2 py-1 text-left whitespace-nowrap align-top leading-tight">{chainage}</td>
														<td className="px-2 py-1 text-right tabular-nums align-top leading-tight">{r.rl ?? ''}</td>
														<td className="px-2 py-1 text-left whitespace-nowrap align-top leading-tight">{r.defectType ?? ''}</td>
														<td className="px-2 py-1 text-right tabular-nums align-top leading-tight">{dims}</td>
														<td className="px-2 py-1 text-right tabular-nums font-medium align-top leading-tight">{formatNum(total)}</td>
														<td className="px-2 py-1 text-right align-top leading-tight">
															{showView ? (<AppButton size='sm' variant='secondary' type='button' onClick={onView}>View</AppButton>) : ''}
														</td>
													</tr>
												);
											})}
										</tbody>
										<tfoot>
											<tr className="bg-muted/30 text-xs md:text-sm font-medium">
												<td className="px-2 py-1 text-left" colSpan={4}>Block Totals:</td>
												<td className="px-2 py-1 text-right tabular-nums">{[formatNum(totals.l), formatNum(totals.w), formatNum(totals.h)].filter(Boolean).join('×')}</td>
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
			{!rows.length && !loading && (<div className="text-sm text-muted-foreground">No cracks found.</div>)}
			<VideoPreviewDialog open={videoOpen} onOpenChange={(o)=>{ if(!o){ setVideoOpen(false); setVideoCrack(null); } }} projectId={projectId} crack={videoCrack} />
		</>
	);

	if (embedded) {
		return <div>{content}</div>;
	}

	return (
		<AppCard>
			<AppCard.Header>
				<AppCard.Title>Crack Identifications</AppCard.Title>
				<AppCard.Description>Imported crack data for this project.</AppCard.Description>
			</AppCard.Header>
			<AppCard.Content>
				{content}
			</AppCard.Content>
		</AppCard>
	);
});

export default ProjectCracks;
