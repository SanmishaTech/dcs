'use client';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useState, useRef, useEffect, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { apiGet } from '@/lib/api-client';
import { AppCard } from '@/components/common/app-card';
import { AppButton } from '@/components/common/app-button';
import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
} from '@/components/ui/context-menu';
import { toast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import {
	AppCombobox,
	type ComboOption,
} from '@/components/common/app-combobox';
import Link from 'next/link';
import { Loader2, Pencil, Trash2, Brush } from 'lucide-react';
import VideoPreviewDialog, {
	type CrackInfo,
} from '../edit/video-preview-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { PERMISSIONS } from '@/config/roles';

interface ProjectDetail {
	id: number;
	name: string;
	designImage?: string | null;
}

interface Crack {
	id: number;
	defectType: string | null;
	blockId: number;
	block?: { id: number; name: string } | null;
	chainageFrom?: string | null;
	chainageTo?: string | null;
	rl?: number | null;
	lengthMm?: number | null;
	widthMm?: number | null;
	heightMm?: number | null;
}

interface Block {
	id: number;
	name: string;
	projectId: number;
}


interface DesignStrokeRec {
	id: number;
	projectId: number;
	crackIdentificationId: number;
	path: string;
	thickness: number;
	color?: string | null;
	crackIdentification?: {
		id: number;
		defectType: string | null;
		chainageFrom: string | null;
		chainageTo: string | null;
		rl: number | null;
		lengthMm: number | null;
		widthMm: number | null;
		heightMm: number | null;
		block?: { id: number; name: string } | null;
		videoFileName?: string | null;
		startTime?: string | null;
		endTime?: string | null;
	} | null;
}

type Natural = { w: number; h: number } | null;

function DesignImageView({
	src,
	onImageLoad,
	natural,
	containerRef,
	overlay,
	drawing,
	loadingImage,
}: {
	src: string;
	onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
	natural: Natural;
	containerRef: React.RefObject<HTMLDivElement>;
	overlay: (scale: number) => React.ReactNode;
	drawing: boolean;
	loadingImage: boolean;
}) {
	const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
	const [scale, setScale] = useState(0.2);
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const [availH, setAvailH] = useState<number | null>(null);

	useEffect(() => {
		const calc = () => {
			if (!wrapperRef.current) return;
			const rect = wrapperRef.current.getBoundingClientRect();
			const bottomPad = 16; // space under card
			const h = Math.max(
				240,
				Math.floor(window.innerHeight - rect.top - bottomPad)
			);
			setAvailH(h);
		};
		calc();
		window.addEventListener('resize', calc);
		return () => window.removeEventListener('resize', calc);
	}, []);

	return (
		<div className='relative'>
			<div className='flex flex-wrap gap-2 items-center mb-1'>
				<AppButton
					size='sm'
					type='button'
					onClick={() => transformRef.current?.zoomIn(0.2)}
					iconName='ZoomIn'
				>
					In
				</AppButton>
				<AppButton
					size='sm'
					type='button'
					onClick={() => transformRef.current?.zoomOut(0.2)}
					iconName='ZoomOut'
				>
					Out
				</AppButton>
				<AppButton
					size='sm'
					type='button'
					onClick={() => transformRef.current?.resetTransform()}
					iconName='RefreshCcw'
				>
					Reset
				</AppButton>
				<div className='text-xs text-muted-foreground'>
					Scale: {scale.toFixed(2)}
				</div>
				{natural && (
					<div className='text-xs text-muted-foreground'>
						Image: {natural.w}×{natural.h}
					</div>
				)}
				{drawing && (
					<div className='text-xs text-amber-600'>Drawing… drag on image</div>
				)}
				{!natural && loadingImage && (
					<div className='text-xs text-muted-foreground'>Loading image…</div>
				)}
			</div>
			<div
				ref={wrapperRef}
				className='relative border rounded bg-muted/30 overflow-hidden'
				style={availH ? { height: availH } : undefined}
			>
				<TransformWrapper
					ref={transformRef}
					initialScale={20}
					onTransformed={(ref) => setScale(ref.state.scale)}
					minScale={0.2}
					maxScale={50}
					limitToBounds
					wheel={{ step: 0.2, disabled: drawing }}
					pinch={{ disabled: drawing }}
					panning={{ disabled: drawing }}
					doubleClick={{ disabled: true }}
				>
					<TransformComponent wrapperClass='!w-full !h-full'>
						<div ref={containerRef} className='relative inline-block'>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={src}
								alt='design'
								onLoad={onImageLoad}
								className='block max-w-full h-auto select-none'
								draggable={false}
							/>
							{overlay(scale)}
						</div>
					</TransformComponent>
				</TransformWrapper>
			</div>
		</div>
	);
}

export default function ProjectDesignPage() {
	const { id } = useParams<{ id: string }>();
	const projectId = Number(id);
	const { can } = usePermissions();
	const canWrite = can(PERMISSIONS.WRITE_DESIGN_MAP);

	const { data, error, isLoading } = useSWR<ProjectDetail>(
		projectId ? `/api/projects/${projectId}` : null,
		apiGet
	);
	const [blockFilter, setBlockFilter] = useState<number | 'all'>('all');
	const { data: blocks } = useSWR<Block[]>(
		projectId ? `/api/blocks?projectId=${projectId}` : null,
		apiGet
	);

	const cracksKey = projectId
		? (() => {
				const sp = new URLSearchParams();
				sp.set('projectId', String(projectId));
				sp.set('page', '1');
				sp.set('pageSize', '100');
				sp.set('excludeMapped', '1');
				if (blockFilter !== 'all') sp.set('blockId', String(blockFilter));
				return `/api/cracks?${sp.toString()}`;
		  })()
		: null;
	const { data: cracksData } = useSWR<{ items: Crack[] }>(cracksKey, apiGet);
	const { data: designStrokesData, mutate: mutateStrokes } = useSWR<{
		items: DesignStrokeRec[];
	}>(projectId ? `/api/design-strokes?projectId=${projectId}` : null, apiGet);

	const containerRef = useRef<HTMLDivElement | null>(null);
	const [natural, setNatural] = useState<Natural>(null);
	const [imageSrc, setImageSrc] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			if (!data?.designImage) {
				setImageSrc(null);
				return;
			}
			const val = data.designImage;
			if (val.startsWith('projects/')) {
				try {
					const res = await fetch('/api/uploads/presign-get', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ key: val }),
					});
					if (res.ok) {
						const j = await res.json();
						setImageSrc(j.url);
						return;
					}
				} catch {}
				setImageSrc(null);
			} else {
				setImageSrc(`/uploads/projects/${projectId}/designs/${val}`);
			}
		})();
	}, [data?.designImage, projectId]);

	// Drawing state
	const [mode] = useState<'brush'>('brush');
	const [drawing, setDrawing] = useState(false);
	const [draftPoints, setDraftPoints] = useState<
		Array<{ x: number; y: number }>
	>([]);
	const [pendingPath, setPendingPath] = useState<string | null>(null);

	const [selectedCrackId, setSelectedCrackId] = useState<number | ''>('');
	const [menuTarget, setMenuTarget] = useState<
			| { type: 'canvas' }
			| { type: 'stroke'; id: number; crackId?: number | null }
			| null
		>(null);
	const [createDialog, setCreateDialog] = useState<{ crackId: number | '' } | null>(null);
	const [createThickness, setCreateThickness] = useState<number>(2);
	const [createColor, setCreateColor] = useState<string>('#fef08a');
	const [videoOpen, setVideoOpen] = useState(false);
	const [videoCrack, setVideoCrack] = useState<CrackInfo | null>(null);
	const [strokeEdit, setStrokeEdit] = useState<{
		id: number;
		crackId: number | '';
		thickness: number;
		color: string;
	} | null>(null);

	// Loading states for Save actions
	const [savingCreate, setSavingCreate] = useState(false); // create stroke (select crack dialog)
	const [savingStrokeEdit, setSavingStrokeEdit] = useState(false); // update stroke

	// Delete confirmation for rect/stroke
	const [confirmDelete, setConfirmDelete] = useState<
		{ type: 'stroke'; id: number } | null
	>(null);

	const designStrokes = useMemo(() => designStrokesData?.items || [], [designStrokesData?.items]);
	const cracks = useMemo(() => cracksData?.items || [], [cracksData?.items]);

	// Color selection state inside the Select Crack dialog
	// Color selection moved to stroke level; Select Crack dialog has no color controls

	const formatNum = (v: number | null | undefined) =>
		v == null
			? ''
			: Number.isInteger(v)
			? String(v)
			: (v as number).toFixed(2).replace(/\.00$/, '');

	const crackOptions: ComboOption[] = (() => {
		const opts = cracks.map((c) => {
			const chainage = [c.chainageFrom, c.chainageTo]
				.filter(Boolean)
				.join(' - ');
			const hasDims =
				c.lengthMm != null || c.widthMm != null || c.heightMm != null;
			const dims = hasDims
				? `${formatNum(c.lengthMm)}×${formatNum(c.widthMm)}×${formatNum(
						c.heightMm
				  )} mm`
				: '';
			const parts = [
				chainage ? `Ch: ${chainage}` : null,
				c.rl != null ? `RL: ${formatNum(c.rl)}` : null,
				c.defectType || null,
				dims || null,
			].filter(Boolean) as string[];
			const line = `#${c.id} ${parts.join(' | ')}`;
			return {
				value: c.id,
				label: <div className='truncate text-sm'>{line}</div>,
				searchText: line,
			} as ComboOption;
		});
		return opts;
	})();

	// Reorder options for Edit dialog to show the selected crack first; if it's not
	// in the cracks list (because excludeMapped=1), synthesize it from the stroke.
	const editCrackOptions: ComboOption[] = useMemo(() => {
		if (!strokeEdit) return crackOptions;
		const selectedId = strokeEdit.crackId;
		const idx = crackOptions.findIndex((o) => o.value === selectedId);
		if (idx >= 0) {
			const sel = crackOptions[idx];
			return [sel, ...crackOptions.slice(0, idx), ...crackOptions.slice(idx + 1)];
		}
		// Not found: add from current stroke's crack info (if available)
		const st = designStrokes.find((s) => s.id === strokeEdit.id);
		const ci = st?.crackIdentification;
		if (ci) {
			const chainage = [ci.chainageFrom, ci.chainageTo].filter(Boolean).join(' - ');
			const hasDims = ci.lengthMm != null || ci.widthMm != null || ci.heightMm != null;
			const dims = hasDims
				? `${formatNum(ci.lengthMm)}×${formatNum(ci.widthMm)}×${formatNum(ci.heightMm)} mm`
				: '';
			const parts = [
				chainage ? `Ch: ${chainage}` : null,
				ci.rl != null ? `RL: ${formatNum(ci.rl)}` : null,
				ci.defectType || null,
				dims || null,
			].filter(Boolean) as string[];
			const line = `#${ci.id} ${parts.join(' | ')}`;
			const opt: ComboOption = {
				value: ci.id,
				label: <div className='truncate text-sm'>{line}</div>,
				searchText: line,
			};
			return [opt, ...crackOptions];
		}
		return crackOptions;
	}, [crackOptions, designStrokes, strokeEdit]);

	const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
		const img = e.currentTarget;
		setNatural({ w: img.naturalWidth, h: img.naturalHeight });
	};

	const handlePointerDown = (e: React.PointerEvent) => {
		if (e.button !== 0) return;
		if (!drawing || !natural) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const scale = rect.width / natural.w || 1;
		const x = (e.clientX - rect.left) / scale;
		const y = (e.clientY - rect.top) / scale;
		setDraftPoints([{ x, y }]);
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!drawing || !natural) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const scale = rect.width / natural.w || 1;
		const x = (e.clientX - rect.left) / scale;
		const y = (e.clientY - rect.top) / scale;
		setDraftPoints((pts) => (pts.length ? [...pts, { x, y }] : pts));
	};

	const handlePointerUp = () => {
		if (!drawing) return;
		if (draftPoints.length < 2) {
			setDraftPoints([]);
			setDrawing(false);
			return;
		}
		const round = (v: number) => Number(v.toFixed(2));
		const [p0, ...rest] = draftPoints;
		const segs = [`M ${round(p0.x)} ${round(p0.y)}`].concat(
			rest.map((p) => `L ${round(p.x)} ${round(p.y)}`)
		);
		const path = segs.join(' ');
		setPendingPath(path);
	setCreateDialog({ crackId: '' });
	setCreateThickness(2);
	setCreateColor('#fef08a');
		setDrawing(false);
	};

	const cancelPending = () => {
		setPendingPath(null);
		setDraftPoints([]);
		setSelectedCrackId('');
	setCreateThickness(2);
	setCreateColor('#fef08a');
	};

	const savePending = async () => {
		if (!selectedCrackId) return;
		try {
			setSavingCreate(true);
			if (pendingPath) {
				// Enforce single-stroke-per-crack: update if exists, else create
				const existing = designStrokes.find(
					(s) => s.crackIdentificationId === selectedCrackId
				);
				let ok = false;
				let res: Response | null = null;
				if (existing) {
					res = await fetch(`/api/design-strokes/${existing.id}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ path: pendingPath, thickness: createThickness || existing.thickness || 2, color: createColor }),
					});
					ok = res.ok;
				} else {
		    res = await fetch('/api/design-strokes', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							projectId,
							crackIdentificationId: selectedCrackId,
							path: pendingPath,
			    thickness: createThickness || 2,
			    color: createColor,
						}),
					});
					ok = res.ok;
				}
				if (!ok) {
					const msg = await (res ? res.json().catch(() => ({})) : {});
					throw new Error(msg?.message || 'Failed to create stroke');
				}
				await mutateStrokes();
				toast.success('Stroke created');
				setPendingPath(null);
				setDraftPoints([]);
				setCreateDialog(null);
				setCreateThickness(2);
				setCreateColor('#fef08a');
			}
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSavingCreate(false);
		}
	};

	async function handleDelete(type: 'stroke', id: number) {
		try {
			const url = `/api/design-strokes/${id}`;
			const res = await fetch(url, { method: 'DELETE' });
			if (!res.ok) throw new Error('Delete failed');
			await mutateStrokes();
			toast.success('Deleted');
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setMenuTarget(null);
			setConfirmDelete(null);
		}
	}

	const overlay = (scale: number) =>
		natural &&
		(canWrite ? (
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div
						className='absolute top-0 left-0'
						style={{ width: natural.w, height: natural.h }}
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerUp}
						onContextMenuCapture={() => setMenuTarget({ type: 'canvas' })}
					>
						<svg
							className='absolute top-0 left-0 z-20'
							width={natural.w}
							height={natural.h}
							viewBox={`0 0 ${natural.w} ${natural.h}`}
						>
							{/* Strokes */}
							{designStrokes.map((s) => {
								const ci = s.crackIdentification;
								const tooltipTitle = ci
									? [
											ci.defectType || '',
											ci.block?.name ? `Block: ${ci.block.name}` : '',
											[ci.chainageFrom, ci.chainageTo]
												.filter(Boolean)
												.join(' - ')
												? `Ch: ${[ci.chainageFrom, ci.chainageTo]
														.filter(Boolean)
														.join(' - ')}`
												: '',
											ci.rl != null ? `RL: ${ci.rl}` : '',
									  ]
											.filter(Boolean)
											.join(' | ')
									: `#${s.id}`;
								return (
									<g key={`stroke-${s.id}`}>
										<title>{tooltipTitle}</title>
												<path
											d={s.path}
											fill='none'
													stroke={(() => {
														const c = s.color;
														if (!c) return 'rgba(254,240,138,0.7)';
														if (c === 'yellow') return 'rgba(254,240,138,0.7)';
														if (c === 'red') return 'rgba(239,68,68,0.7)';
														if (c === 'white') return 'rgba(255,255,255,0.7)';
														const hex = c.trim();
														if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
															let hc = hex.slice(1);
															if (hc.length === 3) hc = hc.split('').map((ch) => ch + ch).join('');
															const num = parseInt(hc, 16);
															const r = (num >> 16) & 255;
															const g = (num >> 8) & 255;
															const b = num & 255;
															return `rgba(${r},${g},${b},0.7)`;
														}
														return c; // assume valid CSS color
													})()}
											strokeWidth={Math.max(0.5, ((s.thickness || 2) * 0.5) / (scale || 1))}
											strokeLinecap='round'
											strokeLinejoin='round'
											className='cursor-pointer'
											onContextMenu={() =>
												setMenuTarget({
													type: 'stroke',
													id: s.id,
													crackId: s.crackIdentification?.id ?? null,
												})
											}
											onClick={() => {
												const ci = s.crackIdentification;
												if (!ci) {
													setVideoCrack(null);
													setVideoOpen(true);
													return;
												}
												const payload: CrackInfo = {
													id: ci.id,
													blockName: ci.block?.name || null,
													chainageFrom: ci.chainageFrom,
													chainageTo: ci.chainageTo,
													rl: ci.rl,
													defectType: ci.defectType,
													lengthMm: ci.lengthMm,
													widthMm: ci.widthMm,
													heightMm: ci.heightMm,
													videoFileName: ci.videoFileName,
													startTime: ci.startTime,
													endTime: ci.endTime,
												};
												setVideoCrack(payload);
												setVideoOpen(true);
											}}
										/>
									</g>
								);
							})}

							{/* Rect maps removed */}

							{/* Draft overlays */}
							{mode === 'brush' && draftPoints.length > 1 && (
								<polyline
									points={draftPoints.map((p) => `${p.x},${p.y}`).join(' ')}
									fill='none'
									stroke={(() => {
										const c = createColor;
										if (!c) return 'rgba(254,240,138,0.7)';
										if (c === 'yellow') return 'rgba(254,240,138,0.7)';
										if (c === 'red') return 'rgba(239,68,68,0.7)';
										if (c === 'white') return 'rgba(255,255,255,0.7)';
										const hex = c.trim();
										if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
											let hc = hex.slice(1);
											if (hc.length === 3) hc = hc.split('').map((ch) => ch + ch).join('');
											const num = parseInt(hc, 16);
											const r = (num >> 16) & 255;
											const g = (num >> 8) & 255;
											const b = num & 255;
											return `rgba(${r},${g},${b},0.7)`;
										}
										return c;
									})()}
									strokeWidth={Math.max(0.5, ((createThickness || 2) * 0.5) / (scale || 1))}
									strokeLinecap='round'
									strokeLinejoin='round'
								/>
							)}
							{/* No rectangle drafts in strokes-only mode */}
						</svg>
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent>
					{menuTarget?.type === 'stroke' ? (
						canWrite ? (
							<>
								<ContextMenuItem
									onSelect={() => {
										if (menuTarget?.type === 'stroke') {
											const s = designStrokes.find((x) => x.id === menuTarget.id);
											if (s) {
												let col = s.color || '#fef08a';
												if (col === 'yellow') col = '#fef08a';
												if (col === 'red') col = '#ef4444';
												if (col === 'white') col = '#ffffff';
												setStrokeEdit({
													id: s.id,
													crackId: s.crackIdentificationId,
													thickness: Math.max(1, s.thickness || 2),
													color: col,
												});
											}
										}
									}}
								>
									<Pencil className='mr-2 h-4 w-4' /> Edit
								</ContextMenuItem>
								<ContextMenuItem
									onSelect={() => {
										if (menuTarget?.type === 'stroke')
											setConfirmDelete({ type: 'stroke', id: menuTarget.id });
									}}
									variant='destructive'
								>
									<Trash2 className='mr-2 h-4 w-4' /> Delete
								</ContextMenuItem>
							</>
						) : null
					) : canWrite ? (
						<>
							<ContextMenuItem
								onSelect={() => {
									cancelPending();
									setDrawing(true);
									setMenuTarget(null);
								}}
							>
								<Brush className='mr-2 h-4 w-4' /> New Stroke
							</ContextMenuItem>
						</>
					) : null}
				</ContextMenuContent>
				</ContextMenu>
			) : (
			<div
				className='absolute top-0 left-0'
				style={{ width: natural.w, height: natural.h }}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onContextMenu={(e) => e.preventDefault()}
			>
				<svg
					className='absolute top-0 left-0 z-20'
					width={natural.w}
					height={natural.h}
					viewBox={`0 0 ${natural.w} ${natural.h}`}
				>
							{designStrokes.map((s) => (
								<path
									key={`stroke-${s.id}`}
									d={s.path}
									fill='none'
									stroke={(() => {
										const c = s.color;
										if (!c) return 'rgba(254,240,138,0.7)';
										if (c === 'yellow') return 'rgba(254,240,138,0.7)';
										if (c === 'red') return 'rgba(239,68,68,0.7)';
										if (c === 'white') return 'rgba(255,255,255,0.7)';
										const hex = c.trim();
										if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
											let hc = hex.slice(1);
											if (hc.length === 3) hc = hc.split('').map((ch) => ch + ch).join('');
											const num = parseInt(hc, 16);
											const r = (num >> 16) & 255;
											const g = (num >> 8) & 255;
											const b = num & 255;
											return `rgba(${r},${g},${b},0.7)`;
										}
										return c;
									})()}
									strokeWidth={Math.max(0.5, ((s.thickness || 2) * 0.5) / (scale || 1))}
									strokeLinecap='round'
									strokeLinejoin='round'
								/>
							))}
					{/* Maps removed in read-only view */}
					{mode === 'brush' && draftPoints.length > 1 && (
						<polyline
							points={draftPoints.map((p) => `${p.x},${p.y}`).join(' ')}
							fill='none'
							stroke={(() => {
								const c = createColor;
								if (!c) return 'rgba(254,240,138,0.7)';
								if (c === 'yellow') return 'rgba(254,240,138,0.7)';
								if (c === 'red') return 'rgba(239,68,68,0.7)';
								if (c === 'white') return 'rgba(255,255,255,0.7)';
								const hex = c.trim();
								if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
									let hc = hex.slice(1);
									if (hc.length === 3) hc = hc.split('').map((ch) => ch + ch).join('');
									const num = parseInt(hc, 16);
									const r = (num >> 16) & 255;
									const g = (num >> 8) & 255;
									const b = num & 255;
									return `rgba(${r},${g},${b},0.7)`;
								}
								return c;
							})()}
							strokeWidth={Math.max(0.5, ((createThickness || 2) * 0.5) / (scale || 1))}
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					)}
					{/* No rectangle drafts in strokes-only mode */}
				</svg>
			</div>
		));

	if (!projectId) return <div className='p-6'>Invalid project id</div>;
	if (error)
		return <div className='p-6 text-destructive'>Failed to load project</div>;
	if (!isLoading && !can(PERMISSIONS.READ_DESIGN_MAP))
		return <div className='p-6 text-destructive'>Access restricted.</div>;

	return (
		<AppCard className='mt-4'>
			<AppCard.Header>
				<AppCard.Title>Design - {data?.name || '...'}</AppCard.Title>
				<AppCard.Description>
					Zoom & pan the project design image.
				</AppCard.Description>
				<AppCard.Action>
					<Link
						href={`/projects/${projectId}/cracks`}
						className={buttonVariants({ variant: 'secondary', size: 'sm' })}
					>
						Go to Cracks
					</Link>
				</AppCard.Action>
			</AppCard.Header>
			<AppCard.Content className='space-y-3'>
				{isLoading && (
					<div className='text-sm text-muted-foreground'>Loading...</div>
				)}
				{!isLoading && !imageSrc && (
					<div className='text-sm text-muted-foreground'>
						No design image uploaded. Upload a design image in project edit to
						enable mapping.
					</div>
				)}
				{imageSrc && (
					<div className='flex flex-col gap-2'>
						<DesignImageView
							src={imageSrc}
							onImageLoad={handleImageLoad}
							natural={natural}
							containerRef={containerRef}
							overlay={overlay}
							drawing={drawing}
							loadingImage={!!imageSrc && !natural}
						/>
						{/* Editing UI removed */}
						<p className='text-xs text-muted-foreground'>
							Use mouse wheel (Ctrl + wheel for browser zoom avoided) or buttons
							to zoom. Pan by dragging.
						</p>
						<p className='text-xs text-muted-foreground'>
							Shortcuts: + / = zoom in, - zoom out, 0 reset, f fit.
						</p>
						{canWrite && (
							<div className='mt-1 text-xs text-muted-foreground'>
								<div className='font-medium text-foreground'>
									Add / update maps
								</div>
								<ul className='list-disc pl-5 space-y-1'>
									<li>
										Right-click on the image and choose “New Map”, then drag to
										draw a rectangle.
									</li>
									<li>
										Select a crack in the dialog and click Save to create the
										map.
									</li>
									<li>Right-click an existing map to Edit or Delete it.</li>
									<li>Press ESC to cancel drawing.</li>
								</ul>
							</div>
						)}
						<ConfirmDialog
							open={confirmDelete != null}
							onOpenChange={(o) => {
								if (!o) setConfirmDelete(null);
							}}
							title='Delete overlay?'
							description={confirmDelete ? `This will permanently remove stroke #${confirmDelete.id}.` : undefined}
							confirmText='Delete'
							onConfirm={async () => {
								if (confirmDelete) {
									await handleDelete(confirmDelete.type, confirmDelete.id);
								}
							}}
						/>

						<Dialog
							open={!!createDialog}
							onOpenChange={(o) => {
								if (!o) {
									cancelPending();
									setCreateDialog(null);
								}
							}}
						>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Select Crack</DialogTitle>
								</DialogHeader>
								<div className='space-y-3'>
									<div className='flex items-center gap-2'>
										<label className='text-sm w-20 shrink-0'>Block</label>
										<div className='flex-1'>
											<AppCombobox
												options={[
													{
														value: 'all',
														label: <div className='truncate text-sm'>All</div>,
														searchText: 'All',
													},
													...(blocks || []).map((b) => ({
														value: b.id,
														label: (
															<div className='truncate text-sm'>{b.name}</div>
														),
														searchText: b.name,
													})),
												]}
												value={blockFilter}
												onValueChange={(v) =>
													setBlockFilter(
														v === null || v === 'all' ? 'all' : Number(v)
													)
												}
												placeholder='All Blocks'
												searchPlaceholder='Search blocks...'
												emptyText='No blocks'
											/>
										</div>
									</div>
									<div className='flex items-center gap-2'>
										<label className='text-sm w-20 shrink-0'>Crack</label>
										<div className='flex-1'>
											<AppCombobox
												options={editCrackOptions}
												value={createDialog?.crackId ?? null}
												onValueChange={(v) =>
													setCreateDialog((d) =>
														d ? { crackId: v ? Number(v) : '' } : d
													)
												}
												placeholder='Select Crack'
												searchPlaceholder='Search cracks...'
												emptyText='No cracks'
											/>
										</div>
									</div>
									<div className='flex items-center gap-2'>
										<label className='text-sm w-20 shrink-0'>Color</label>
										<div className='flex items-center gap-2'>
											<button
												type='button'
												title='Yellow'
												onClick={() => setCreateColor('#fef08a')}
												className={`h-5 w-5 rounded-full border bg-amber-300 ${createColor === '#fef08a' ? 'ring-2 ring-offset-1 ring-foreground' : ''}`}
											/>
											<button
												type='button'
												title='Red'
												onClick={() => setCreateColor('#ef4444')}
												className={`h-5 w-5 rounded-full border bg-red-500 ${createColor === '#ef4444' ? 'ring-2 ring-offset-1 ring-foreground' : ''}`}
											/>
											<button
												type='button'
												title='White'
												onClick={() => setCreateColor('#ffffff')}
												className={`h-5 w-5 rounded-full border bg-white ${createColor === '#ffffff' ? 'ring-2 ring-offset-1 ring-foreground' : ''}`}
											/>
										</div>
									</div>
								</div>
								<DialogFooter className='mt-4'>
									<Button
										variant='outline'
										size='sm'
										type='button'
										onClick={() => {
											cancelPending();
											setCreateDialog(null);
										}}
									>
										Cancel
									</Button>
									<Button
										size='sm'
										type='button'
										disabled={!createDialog?.crackId || savingCreate}
										onClick={() => {
											if (createDialog?.crackId) {
												setSelectedCrackId(createDialog.crackId);
												void savePending();
											}
										}}
									>
										{savingCreate ? (
											<span className='inline-flex items-center gap-2'>
												<Loader2 className='h-4 w-4 animate-spin' />
												Saving...
											</span>
										) : (
											'Save'
										)}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>

						{/* Stroke Edit Dialog */}
						<Dialog
							open={!!strokeEdit}
							onOpenChange={(o) => {
								if (!o) setStrokeEdit(null);
							}}
						>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Edit Stroke</DialogTitle>
								</DialogHeader>
								{strokeEdit && (
									<div className='space-y-3'>
										<div className='flex items-center gap-2'>
											<label className='text-sm w-24 shrink-0'>Crack</label>
											<div className='flex-1'>
												<AppCombobox
													options={crackOptions}
													value={strokeEdit.crackId ?? null}
													onValueChange={(v) =>
														setStrokeEdit((s) =>
															s ? { ...s, crackId: v ? Number(v) : '' } : s
														)
													}
													placeholder='Select Crack'
													searchPlaceholder='Search cracks...'
													emptyText='No cracks'
												/>
											</div>
										</div>
										<div className='flex items-center gap-2'>
											<label className='text-sm w-24 shrink-0'>Color</label>
											<div className='flex items-center gap-2'>
												<button
													type='button'
													title='Yellow'
													onClick={() =>
														setStrokeEdit((s) => (s ? { ...s, color: '#fef08a' } : s))
													}
													className={`h-5 w-5 rounded-full border bg-amber-300 ${strokeEdit.color === '#fef08a' ? 'ring-2 ring-offset-1 ring-foreground' : ''}`}
												/>
												<button
													type='button'
													title='Red'
													onClick={() =>
														setStrokeEdit((s) => (s ? { ...s, color: '#ef4444' } : s))
													}
													className={`h-5 w-5 rounded-full border bg-red-500 ${strokeEdit.color === '#ef4444' ? 'ring-2 ring-offset-1 ring-foreground' : ''}`}
												/>
												<button
													type='button'
													title='White'
													onClick={() =>
														setStrokeEdit((s) => (s ? { ...s, color: '#ffffff' } : s))
													}
													className={`h-5 w-5 rounded-full border bg-white ${strokeEdit.color === '#ffffff' ? 'ring-2 ring-offset-1 ring-foreground' : ''}`}
												/>
											</div>
										</div>
									</div>
								)}
								<DialogFooter className='mt-4'>
									<Button
										variant='outline'
										size='sm'
										type='button'
										onClick={() => setStrokeEdit(null)}
									>
										Cancel
									</Button>
									<Button
										size='sm'
										type='button'
										disabled={!strokeEdit || savingStrokeEdit}
										onClick={async () => {
											if (!strokeEdit) return;
											try {
												setSavingStrokeEdit(true);
												const res = await fetch(
													`/api/design-strokes/${strokeEdit.id}`,
													{
														method: 'PATCH',
														headers: { 'Content-Type': 'application/json' },
														body: JSON.stringify({
															crackIdentificationId:
																strokeEdit.crackId || undefined,
															color: strokeEdit.color,
														}),
													}
												);
												if (!res.ok) {
													const msg = await res.json().catch(() => ({}));
													throw new Error(
														msg?.message || 'Failed to update stroke'
													);
												}
												await mutateStrokes();
												toast.success('Stroke updated');
												setStrokeEdit(null);
											} catch (e) {
												toast.error((e as Error).message);
											} finally {
												setSavingStrokeEdit(false);
											}
										}}
									>
										{savingStrokeEdit ? (
											<span className='inline-flex items-center gap-2'>
												<Loader2 className='h-4 w-4 animate-spin' />
												Saving...
											</span>
										) : (
											'Save'
										)}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>

						<VideoPreviewDialog
							open={videoOpen}
							onOpenChange={(o) => {
								if (!o) {
									setVideoOpen(false);
									setVideoCrack(null);
								}
							}}
							projectId={projectId}
							crack={videoCrack}
						/>
					</div>
				)}
			</AppCard.Content>
		</AppCard>
	);
}
