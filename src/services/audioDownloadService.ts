/**
 * audioDownloadService.ts
 * Gerencia o download do stream de áudio do YouTube e o salva em disco.
 * Exibe barra de progresso no terminal durante o download.
 */

import fs from 'fs-extra';
import path from 'path';
import { Readable } from 'stream';
import type { ReadableStream as NodeReadableStream } from 'stream/web';
import logger from '../utils/logger.js';
import { sanitizeFilename } from '../utils/sanitizeFilename.js';
import { extractVideoId } from '../utils/validateUrl.js';
import { getInnertube } from './innertubeClient.js';

/** Opções para o download de áudio. */
export interface DownloadOptions {
  /** URL pública do vídeo. */
  url: string;
  /** Itag do formato de áudio selecionado. */
  itag: number;
  /** Título do vídeo (usado como nome base do arquivo). */
  title: string;
  /** Extensão do arquivo (ex: 'webm', 'm4a', 'opus'). */
  extension: string;
}

/** Resultado do download. */
export interface DownloadResult {
  /** Caminho completo do arquivo salvo. */
  filePath: string;
  /** Tamanho final do arquivo em bytes. */
  fileSizeBytes: number;
}

/**
 * Realiza o download do stream de áudio e salva no diretório `downloads/`.
 * Exibe o progresso percentual no terminal em tempo real.
 *
 * @param options - Opções do download.
 * @returns Resultado com o caminho do arquivo salvo e seu tamanho.
 */
export async function downloadAudio(options: DownloadOptions): Promise<DownloadResult> {
  const { url, itag, title, extension } = options;

  // Prepara o diretório de saída
  const downloadsDir = path.resolve(process.cwd(), 'downloads');
  await fs.ensureDir(downloadsDir);

  // Sanitiza o título para uso seguro como nome de arquivo
  const safeName = sanitizeFilename(title);
  const filePath = path.join(downloadsDir, `${safeName}.${extension}`);

  logger.info(`Iniciando download: "${title}" → ${filePath}`);

  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Não foi possível extrair o ID do vídeo a partir da URL informada.');
  }

  const innertube = await getInnertube();

  // Busca as informações do vídeo uma única vez, usadas tanto para obter o
  // tamanho total do formato (progresso) quanto para iniciar o download.
  let totalBytes = 0;
  let webStream: NodeReadableStream<Uint8Array>;
  try {
    const info = await innertube.getBasicInfo(videoId);
    const format = info.chooseFormat({ itag });
    totalBytes = format.content_length ?? 0;
    webStream = await info.download({ itag });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Erro ao iniciar o download: ${message}`);
    throw new Error(`Falha no download: ${message}`);
  }

  const stream = Readable.fromWeb(webStream);

  return new Promise<DownloadResult>((resolve, reject) => {
    let downloadedBytes = 0;

    // Atualiza o progresso a cada chunk recebido
    stream.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
        // Usa \r para sobrescrever a linha anterior no terminal
        process.stdout.write(`\r  Progresso: ${percent}% (${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)})`);
      } else {
        process.stdout.write(`\r  Baixado: ${formatBytes(downloadedBytes)}`);
      }
    });

    stream.on('error', (err: Error) => {
      logger.error(`Erro durante o download: ${err.message}`);
      reject(new Error(`Falha no download: ${err.message}`));
    });

    // Cria o arquivo de saída e conecta o stream
    const fileStream = fs.createWriteStream(filePath);

    stream.pipe(fileStream);

    fileStream.on('finish', async () => {
      // Quebra a linha após a barra de progresso
      process.stdout.write('\n');

      const stat = await fs.stat(filePath);
      logger.info(`Download concluído: ${filePath} (${formatBytes(stat.size)})`);
      resolve({ filePath, fileSizeBytes: stat.size });
    });

    fileStream.on('error', (err: Error) => {
      logger.error(`Erro ao salvar o arquivo: ${err.message}`);
      reject(new Error(`Falha ao salvar o arquivo: ${err.message}`));
    });
  });
}

/**
 * Formata tamanho em bytes para exibição legível.
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}
