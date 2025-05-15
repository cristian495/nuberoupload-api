import fs from 'fs';
import FormData from 'form-data';
import got from 'got';

interface UploadWithProgressParams {
  url: string;
  filePath: string;
  originalName: string;
  fields?: Record<string, string>;
  uploadId: string;
  io?: {
    emit: (event: string, data: any) => void;
  };
  provider: string;
}

export async function uploadWithProgress({
  url,
  filePath,
  originalName,
  fields = {},
  uploadId,
  io,
  provider,
}: UploadWithProgressParams) {
  console.log(`[Upload] ${provider} ${uploadId}:`, url);

  const fileStream = fs.createReadStream(filePath);
  const form = new FormData();
  form.append('file', fileStream, { filename: originalName });
  for (const key in fields) {
    form.append(key, fields[key]);
  }

  const request = got.stream.post(url, {
    body: form,
    headers: form.getHeaders(),
  });

  request.on('uploadProgress', (progress) => {
    const percent = Math.round(progress.percent * 100);
    console.log(`[Upload] ${provider} ${uploadId}: ${percent}%`);
    io?.emit('upload-progress', {
      uploadId,
      provider,
      status: 'uploading',
      progress: percent,
    });
  });

  let responseChunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    request.on('data', (chunk) => responseChunks.push(chunk));
    request.on('end', () => resolve());
    request.on('error', reject);
  });

  const body = Buffer.concat(responseChunks).toString();
  console.log(`[Upload] ${provider} ${uploadId}:`, body);
  const raw = JSON.parse(body);

  return { raw, body };
}
