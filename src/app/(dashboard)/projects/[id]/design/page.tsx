'use client';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useState, useRef, useEffect, useCallback } from 'react';
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
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from '@/components/ui/tooltip';
import {
	AppCombobox,
	type ComboOption,
} from '@/components/common/app-combobox';
import Link from 'next/link';
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
interface DesignMapRec {
	id: number;
	projectId: number;
	crackIdentificationId: number;
	x: number;
	y: number;
	width: number;
	height: number;
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
		// Optional video meta if available on crack record
		videoFileName?: string | null;
		startTime?: string | null;
		endTime?: string | null;
	} | null;
}

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
		return ch / natural.h || 1;
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
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement ||
				(e.target as HTMLElement)?.isContentEditable
			)
				return;
			const { zoomIn, zoomOut } = transformRef.current;
			if (e.key === '+' || e.key === '=') {
				e.preventDefault();
				zoomIn(0.2);
			} else if (e.key === '-') {
				e.preventDefault();
				zoomOut(0.2);
			} else if (e.key === '0' || e.key.toLowerCase() === 'f') {
				e.preventDefault();
				applyFit();
			}
		}
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [applyFit]);

	const containerHeight = natural
		? natural.w / natural.h > WIDE_ASPECT_THRESHOLD
			? '90vh'
			: '70vh'
		: '75vh';

	return (
		<>
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
					onClick={handleReset}
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
				<div className='text-xs text-muted-foreground'>Maps: {mapsCount}</div>
				{drawing && (
					<div className='text-xs text-amber-600'>Drawing… drag on image</div>
				)}
				{!natural && loadingImage && (
					<div className='text-xs text-muted-foreground'>Loading image…</div>
				)}
			</div>
			<div
				ref={containerRef}
				className='relative w-full border rounded bg-muted/30 overflow-hidden'
				style={{ height: containerHeight }}
			>
				<TransformWrapper
					ref={transformRef}
					minScale={0.005}
					maxScale={50}
					limitToBounds={true}
					disablePadding={false}
					doubleClick={{ disabled: true }}
					wheel={{ step: 0.2 }}
					// Disable panning while drawing a new map to prevent image from moving
					panning={{ disabled: drawing }}
					initialScale={20}
					initialPositionX={0}
					initialPositionY={0}
					alignmentAnimation={{ disabled: false }}
					onTransformed={(_ref, state) => setScale(state.scale)}
				>
					<TransformComponent wrapperClass='!h-full' contentClass='!h-full'>
						<div className='relative h-full'>
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
	const { data: designMapsData, mutate: mutateMaps } = useSWR<{
		items: DesignMapRec[];
	}>(projectId ? `/api/design-maps?projectId=${projectId}` : null, apiGet);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
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
				} catch {
					// ignore
				}
				setImageSrc(null);
			} else {
				setImageSrc(`/uploads/projects/${projectId}/designs/${val}`);
			}
		})();
	}, [data?.designImage, projectId]);
	const [drawing, setDrawing] = useState(false);
	const [startPt, setStartPt] = useState<{ x: number; y: number } | null>(null);
	const [draftRect, setDraftRect] = useState<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);
	const [pendingRect, setPendingRect] = useState<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);
	const [selectedCrackId, setSelectedCrackId] = useState<number | ''>('');
	const [menuTarget, setMenuTarget] = useState<
		{ type: 'map'; id: number } | { type: 'canvas' } | null
	>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
	const [editDialog, setEditDialog] = useState<{
		mode: 'create' | 'update';
		rect: { x: number; y: number; width: number; height: number };
		id?: number;
		crackId: number | '';
	} | null>(null);
	const [videoOpen, setVideoOpen] = useState(false);
	const [videoCrack, setVideoCrack] = useState<CrackInfo | null>(null);

	const designMaps = designMapsData?.items || [];
	const cracks = cracksData?.items || [];
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
		// Ensure current crack appears in update mode even if excluded by API
		if (
			editDialog?.mode === 'update' &&
			editDialog.crackId &&
			!cracks.find((c) => c.id === editDialog.crackId)
		) {
			const line = `#${editDialog.crackId} (current)`;
			opts.unshift({
				value: editDialog.crackId,
				label: <div className='truncate text-sm'>{line}</div>,
				searchText: line,
			});
		}
		return opts;
	})();

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
		// Enforce a minimum visual thickness so vertical/horizontal hairlines are visible while dragging.
		const MIN_VISUAL = 0.5; // image px
		setDraftRect({ x: rx, y: ry, width: rw < MIN_VISUAL ? MIN_VISUAL : rw, height: rh < MIN_VISUAL ? MIN_VISUAL : rh });
	};
	const handlePointerUp = () => {
		if (!drawing || !draftRect) {
			setStartPt(null);
			return;
		}
		// Coerce any zero dimension to a tiny hairline so user can proceed
		const MIN_SAVE = 0.5;
		const rectToSave = {
			x: draftRect.x,
			y: draftRect.y,
			width: draftRect.width < MIN_SAVE ? MIN_SAVE : draftRect.width,
			height: draftRect.height < MIN_SAVE ? MIN_SAVE : draftRect.height,
		};
		setEditDialog({ mode: 'create', rect: rectToSave, crackId: '' });
		setPendingRect(rectToSave);
		setDrawing(false);
		setStartPt(null);
	};

	const cancelPending = () => {
		setPendingRect(null);
		setDraftRect(null);
		setSelectedCrackId('');
	};
	const savePending = async () => {
		if (!pendingRect || !natural || !selectedCrackId) return;
		try {
			// Preserve high precision so very thin rectangles are possible (hairline overlays)
			// Only round for payload size (6 decimals) without enforcing a minimum.
			const round = (v: number) => Number(v.toFixed(6));
			const payload = {
				projectId,
				crackIdentificationId: selectedCrackId,
				x: round(pendingRect.x),
				y: round(pendingRect.y),
				width: round(pendingRect.width),
				height: round(pendingRect.height),
			};
			// If user drew a perfectly vertical or horizontal line (dimension 0), promote to a hairline for visibility
			if (payload.width === 0) payload.width = 0.5;
			if (payload.height === 0) payload.height = 0.5;
			const res = await fetch('/api/design-maps', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
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
		setEditDialog({
			mode: 'update',
			rect: { x: m.x, y: m.y, width: m.width, height: m.height },
			id: m.id,
			crackId: m.crackIdentificationId,
		});
	}

	// Keyboard shortcut: ESC to cancel drawing or pending rectangle
	useEffect(() => {
		function keyHandler(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				if (drawing) {
					setDrawing(false);
					setDraftRect(null);
				} else if (pendingRect) {
					cancelPending();
				}
			}
		}
		window.addEventListener('keydown', keyHandler);
		return () => window.removeEventListener('keydown', keyHandler);
	}, [drawing, pendingRect]);

	const overlay =
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
						{/* Existing maps (single consistent color) */}
						{designMaps.map((m) => {
							// Adaptive fallback: if any stored dimension exceeds natural bounds by >1.5x, treat as legacy scaled coords and compress.
							let { x, y, width, height } = m;
							const overScale = Math.max(
								width / natural.w,
								height / natural.h,
								x / natural.w,
								y / natural.h
							);
							if (overScale > 1.5) {
								// heuristic: divide by round(overScale) to bring into view (limit 50 to avoid extremes)
								const factor = Math.min(50, Math.round(overScale));
								x = x / factor;
								y = y / factor;
								width = width / factor;
								height = height / factor;
							}
							if (width <= 0 || height <= 0) return null;
							const hairline = width < 1 || height < 1;
							const ci = m.crackIdentification;
							const chainage = ci
								? [ci.chainageFrom, ci.chainageTo].filter(Boolean).join(' - ')
								: '';
							const dims = ci
								? [ci.lengthMm, ci.widthMm, ci.heightMm]
										.map((v) =>
											v == null
												? ''
												: Number.isInteger(v)
												? String(v)
												: (v as number).toFixed(2).replace(/\.00$/, '')
										)
										.join('×')
								: '';
							const rl = ci?.rl != null ? String(ci.rl) : '';
							const defect = ci?.defectType || '';
							const blockName = ci?.block?.name || '';
							const tooltip =
								`${defect ? defect : ''}${
									blockName ? (defect ? ' | ' : '') + 'Block: ' + blockName : ''
								}${
									chainage
										? (defect || blockName ? ' | ' : '') + 'Ch: ' + chainage
										: ''
								}${rl ? ' | RL: ' + rl : ''}${
									dims.trim() ? ' | Dim: ' + dims + ' mm' : ''
								}` || `#${m.id}`;
							return (
								<Tooltip key={m.id}>
									<TooltipTrigger asChild>
										<div
											className='absolute overflow-visible z-30 cursor-pointer'
											style={{
												left: x,
												top: y,
												width,
												height,
												backgroundColor: hairline ? 'rgba(254,240,138,0.55)' : 'rgba(254,240,138,0.35)',
											}}
											onContextMenu={() => {
												setMenuTarget({ type: 'map', id: m.id });
											}}
											onClick={() => {
												const ci = m.crackIdentification;
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
									</TooltipTrigger>
									<TooltipContent>{tooltip}</TooltipContent>
								</Tooltip>
							);
						})}
						{/* Draft rectangle while dragging */}
						{draftRect && (
							<div
								className='absolute'
								style={{
									left: draftRect.x,
									top: draftRect.y,
									width: draftRect.width,
									height: draftRect.height,
									backgroundColor: draftRect.width < 1 || draftRect.height < 1 ? 'rgba(254,240,138,0.55)' : 'rgba(254,240,138,0.45)',
								}}
							/>
						)}
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent>
					{menuTarget?.type === 'map' ? (
						canWrite ? (
							<>
								<ContextMenuItem
									onSelect={() => {
										if (menuTarget?.type === 'map')
											openUpdateDialog(menuTarget.id);
										setMenuTarget(null);
									}}
								>
									Edit Map
								</ContextMenuItem>
								<ContextMenuItem
									variant='destructive'
									onSelect={() => {
										setConfirmDeleteId(menuTarget.id);
										setMenuTarget(null);
									}}
								>
									Delete Map
								</ContextMenuItem>
							</>
						) : null
					) : canWrite ? (
						<ContextMenuItem
							onSelect={() => {
								cancelPending();
								setDrawing(true);
								setMenuTarget(null);
							}}
						>
							New Map
						</ContextMenuItem>
					) : null}
				</ContextMenuContent>
			</ContextMenu>
		) : (
			// No write permission: render overlay without context menu and block right-click
			<div
				className='absolute top-0 left-0'
				style={{ width: natural.w, height: natural.h }}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onContextMenu={(e) => {
					e.preventDefault();
				}}
			>
				{/* Existing maps (single consistent color) */}
				{designMaps.map((m) => {
					// Adaptive fallback: if any stored dimension exceeds natural bounds by >1.5x, treat as legacy scaled coords and compress.
					let { x, y, width, height } = m;
					const overScale = Math.max(
						width / natural.w,
						height / natural.h,
						x / natural.w,
						y / natural.h
					);
					if (overScale > 1.5) {
						// heuristic: divide by round(overScale) to bring into view (limit 50 to avoid extremes)
						const factor = Math.min(50, Math.round(overScale));
						x = x / factor;
						y = y / factor;
						width = width / factor;
						height = height / factor;
					}
					if (width <= 0 || height <= 0) return null;
					const hairline = width < 1 || height < 1;
					const ci = m.crackIdentification;
					const chainage = ci
						? [ci.chainageFrom, ci.chainageTo].filter(Boolean).join(' - ')
						: '';
					const dims = ci
						? [ci.lengthMm, ci.widthMm, ci.heightMm]
								.map((v) =>
									v == null
										? ''
										: Number.isInteger(v)
										? String(v)
										: (v as number).toFixed(2).replace(/\.00$/, '')
								)
								.join('×')
						: '';
					const rl = ci?.rl != null ? String(ci.rl) : '';
					const defect = ci?.defectType || '';
					const blockName = ci?.block?.name || '';
					const tooltip =
						`${defect ? defect : ''}${
							blockName ? (defect ? ' | ' : '') + 'Block: ' + blockName : ''
						}${
							chainage
								? (defect || blockName ? ' | ' : '') + 'Ch: ' + chainage
								: ''
						}${rl ? ' | RL: ' + rl : ''}${
							dims.trim() ? ' | Dim: ' + dims + ' mm' : ''
						}` || `#${m.id}`;
					return (
						<Tooltip key={m.id}>
							<TooltipTrigger asChild>
								<div
									className='absolute overflow-visible z-30 cursor-pointer'
									style={{
										left: x,
										top: y,
										width,
										height,
										backgroundColor: hairline ? 'rgba(254,240,138,0.55)' : 'rgba(254,240,138,0.35)',
									}}
									onContextMenu={(e) => {
										e.preventDefault();
									}}
									onClick={() => {
										const ci = m.crackIdentification;
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
							</TooltipTrigger>
							<TooltipContent>{tooltip}</TooltipContent>
						</Tooltip>
					);
				})}
				{/* Draft rectangle while dragging */}
				{draftRect && (
					<div
						className='absolute'
						style={{
							left: draftRect.x,
							top: draftRect.y,
							width: draftRect.width,
							height: draftRect.height,
								backgroundColor: draftRect.width < 1 || draftRect.height < 1 ? 'rgba(254,240,138,0.55)' : 'rgba(254,240,138,0.45)',
						}}
					/>
				)}
			</div>
		));

	if (!projectId) return <div className='p-6'>Invalid project id</div>;
	if (error)
		return <div className='p-6 text-destructive'>Failed to load project</div>;
	// View access: allow users with READ_DESIGN_MAP (project users can view); editing requires WRITE_DESIGN_MAP
	if (!isLoading && !can(PERMISSIONS.READ_DESIGN_MAP)) {
		return <div className='p-6 text-destructive'>Access restricted.</div>;
	}

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
							mapsCount={designMaps.length}
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
							open={confirmDeleteId != null}
							onOpenChange={(o) => {
								if (!o) setConfirmDeleteId(null);
							}}
							title='Delete map?'
							description={
								confirmDeleteId != null
									? `This will permanently remove map #${confirmDeleteId}.`
									: undefined
							}
							confirmText='Delete'
							onConfirm={async () => {
								if (confirmDeleteId != null)
									await handleDeleteMap(confirmDeleteId);
							}}
						/>

						<Dialog
							open={!!editDialog}
							onOpenChange={(o) => {
								if (!o) {
									if (editDialog?.mode === 'create') cancelPending();
									setEditDialog(null);
								}
							}}
						>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>
										{editDialog?.mode === 'update'
											? 'Update Map'
											: 'Create Map'}
									</DialogTitle>
								</DialogHeader>
								<div className='space-y-3'>
									<div className='flex flex-col gap-3'>
										<div className='flex items-center gap-2'>
											<label className='text-sm w-20 shrink-0'>Block</label>
											<div className='flex-1'>
												<AppCombobox
													options={[
														{
															value: 'all',
															label: (
																<div className='truncate text-sm'>All</div>
															),
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
													options={crackOptions}
													value={editDialog?.crackId ?? null}
													onValueChange={(v) =>
														setEditDialog((d) =>
															d ? { ...d, crackId: v ? Number(v) : '' } : d
														)
													}
													placeholder='Select Crack'
													searchPlaceholder='Search cracks...'
													emptyText='No cracks'
												/>
											</div>
										</div>
									</div>
								</div>
								<DialogFooter className='mt-4'>
									<Button
										variant='outline'
										size='sm'
										type='button'
										onClick={() => {
											if (editDialog?.mode === 'create') cancelPending();
											setEditDialog(null);
										}}
									>
										Cancel
									</Button>
									{editDialog?.mode === 'create' ? (
										<Button
											size='sm'
											type='button'
											onClick={() => {
												if (editDialog?.crackId) {
													setSelectedCrackId(editDialog.crackId);
													void savePending();
												}
											}}
										>
											Save
										</Button>
									) : (
										<Button
											size='sm'
											type='button'
											onClick={async () => {
												if (editDialog?.id && editDialog?.crackId) {
													try {
														const res = await fetch(
															`/api/design-maps/${editDialog.id}`,
															{
																method: 'PATCH',
																headers: { 'Content-Type': 'application/json' },
																body: JSON.stringify({
																	crackIdentificationId: editDialog.crackId,
																}),
															}
														);
														if (!res.ok) {
															const msg = await res.json().catch(() => ({}));
															throw new Error(
																msg?.message || 'Failed to update map'
															);
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
