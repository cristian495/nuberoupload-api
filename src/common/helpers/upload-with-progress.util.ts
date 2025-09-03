import fs from 'fs';
import FormData from 'form-data';
import got from 'got';
import { Logger } from '@nestjs/common';

interface UploadWithProgressParams {
  url: string;
  filePath: string;
  originalName: string;
  fields?: Record<string, string>;
  fileId: string; // Actually fileId, but kept for compatibility
  providerId: string;
  io?: {
    emit: (event: string, data: any) => void;
  };
  provider: string;
  logger?: Logger;
}

export async function uploadWithProgress({
  url,
  filePath,
  originalName,
  fields = {},
  fileId,
  providerId,
  io,
  provider,
  logger,
}: UploadWithProgressParams) {
  if (logger) {
    logger.log(`📤 Iniciando subida de '${originalName}' a ${provider}`);
  } else {
    console.log(`[Upload] ${provider} ${fileId}:`, url);
  }

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
    if (logger && percent % 10 === 0) { // Solo mostrar cada 10%
      logger.debug(`📤 ${percent}% - '${originalName}' → ${provider}`);
    } else if (!logger) {
      console.log(`[Upload] ${provider} ${fileId}: ${percent}%`);
    }
  });

  let responseChunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    request.on('data', (chunk) => responseChunks.push(chunk));
    request.on('end', () => resolve());
    request.on('error', reject);
  });

  const body = Buffer.concat(responseChunks).toString();
  if (logger) {
    logger.log(`✅ Subida completada: '${originalName}' → ${provider}`);
  } else {
    console.log(`[Upload] ${provider} ${fileId}:`, body);
  }
  const raw = JSON.parse(body);

  return { raw, body };
}
