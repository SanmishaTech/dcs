export type UploadedPart = { ETag: string; PartNumber: number };

export async function multipartUpload({
  file,
  projectId,
  folder,
  chunkSize = 8 * 1024 * 1024, // 8MB per part (S3 min is 5MB; tune as needed)
  concurrency = 4,
  onProgress,
}: {
  file: File;
  projectId: number;
  folder: 'designs' | 'files' | 'videos';
  chunkSize?: number;
  concurrency?: number;
  onProgress?: (uploadedBytes: number, totalBytes: number, percent: number) => void;
}) {
  // 1) Initiate
  const initRes = await fetch('/api/uploads/multipart/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, folder, fileName: file.name, contentType: file.type || 'application/octet-stream' }),
  });
  if (!initRes.ok) throw new Error('Failed to initiate upload');
  const { key, uploadId } = await initRes.json();

  // 2) Split file into chunks
  const parts: UploadedPart[] = [];
  const totalParts = Math.ceil(file.size / chunkSize);
  let index = 0;
  let uploadedBytes = 0;
  onProgress?.(0, file.size, 0);

  async function uploadPart(partNumber: number, start: number, end: number) {
    const blob = file.slice(start, end);
    const signRes = await fetch('/api/uploads/multipart/sign-part', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, uploadId, partNumber, contentLength: blob.size }),
    });
    if (!signRes.ok) throw new Error('Failed to sign part');
    const { url } = await signRes.json();
    const put = await fetch(url, { method: 'PUT', body: blob });
    if (!put.ok) throw new Error(`Failed to upload part ${partNumber}`);
    const etag = put.headers.get('ETag');
    if (!etag) throw new Error('Missing ETag');
  parts.push({ ETag: etag.replaceAll('"', ''), PartNumber: partNumber });
  uploadedBytes += (end - start);
  const pct = Math.min(100, Math.floor((uploadedBytes / file.size) * 100));
  onProgress?.(uploadedBytes, file.size, pct);
  }

  const queue: Promise<void>[] = [];
  while (index < totalParts) {
    while (queue.length < concurrency && index < totalParts) {
      const partNumber = index + 1;
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const p = uploadPart(partNumber, start, end);
      queue.push(p);
      index++;
    }
    try {
      await Promise.all(queue);
    } catch (err) {
      // Abort multipart on error
      await fetch('/api/uploads/multipart/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, uploadId }),
      }).catch(() => {});
      throw err as Error;
    } finally {
      queue.length = 0;
    }
  }

  // 3) Complete
  const completeRes = await fetch('/api/uploads/multipart/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, uploadId, parts: parts.sort((a, b) => a.PartNumber - b.PartNumber) }),
  });
  if (!completeRes.ok) throw new Error('Failed to complete upload');
  await completeRes.json();
  onProgress?.(file.size, file.size, 100);
  return { key };
}
