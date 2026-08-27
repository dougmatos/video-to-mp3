import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import logger from '../utils/logger.js';

export type DownloadFormat = 'mp3' | 'mp4';

export interface YtDlpResult {
  filePath: string;
}

/**
 * Baixa uma URL do YouTube como áudio MP3 ou vídeo MP4.
 */
export async function downloadWithYtDlp(
  url: string,
  format: DownloadFormat,
): Promise<YtDlpResult> {
  const downloadsDir = path.resolve(process.cwd(), 'downloads');
  await fs.ensureDir(downloadsDir);

  const formatArgs = format === 'mp3'
    ? [
        '--extract-audio',
        '--audio-format',
        'mp3',
        '--audio-quality',
        '0',
      ]
    : [
        '--format',
        'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b',
        '--merge-output-format',
        'mp4',
        '--remux-video',
        'mp4',
      ];

  const args = [
    '--no-playlist',
    '--force-ipv4',
    ...formatArgs,
    '--no-progress',
    '--js-runtimes',
    'node',
    '--remote-components',
    'ejs:github',
    '--restrict-filenames',
    '--paths',
    downloadsDir,
    '--output',
    '%(title).180B_%(id)s.%(ext)s',
    '--print',
    'after_move:filepath',
    url,
  ];

  logger.info(`[yt-dlp] Iniciando download em ${format.toUpperCase()}: ${url}`);

  return new Promise<YtDlpResult>((resolve, reject) => {
    const child = spawn('yt-dlp', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout.push(text);
      text
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => logger.info(`[yt-dlp] ${line}`));
    });

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr.push(text);
      text
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => logger.warn(`[yt-dlp] ${line}`));
    });

    child.on('error', (err) => {
      reject(new Error(`Falha ao iniciar yt-dlp: ${err.message}`));
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        const details = stderr.join('').trim() || stdout.join('').trim();
        reject(new Error(`yt-dlp finalizou com código ${code}. ${details}`.trim()));
        return;
      }

      const outputLines = stdout
        .join('')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const expectedExtension = `.${format}`;
      const filePath = outputLines
        .reverse()
        .find((line) => line.toLowerCase().endsWith(expectedExtension));
      if (!filePath) {
        reject(new Error(`yt-dlp não retornou o caminho do arquivo ${format.toUpperCase()} gerado.`));
        return;
      }

      try {
        await fs.access(filePath);
        logger.info(`[yt-dlp] ${format.toUpperCase()} gerado: ${filePath}`);
        resolve({ filePath });
      } catch {
        reject(new Error(`Arquivo informado pelo yt-dlp não foi encontrado: ${filePath}`));
      }
    });
  });
}

/** Mantém compatibilidade com consumidores que usam a função específica de MP3. */
export async function downloadMp3WithYtDlp(url: string): Promise<{ mp3Path: string }> {
  const { filePath } = await downloadWithYtDlp(url, 'mp3');
  return { mp3Path: filePath };
}
