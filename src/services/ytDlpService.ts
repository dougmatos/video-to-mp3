import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import logger from '../utils/logger.js';

export interface YtDlpResult {
  mp3Path: string;
}

export async function downloadMp3WithYtDlp(url: string): Promise<YtDlpResult> {
  const downloadsDir = path.resolve(process.cwd(), 'downloads');
  await fs.ensureDir(downloadsDir);

  const args = [
    '--no-playlist',
    '--extract-audio',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '0',
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

  logger.info(`[yt-dlp] Iniciando download/conversão: ${url}`);

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

      const mp3Path = outputLines.reverse().find((line) => line.endsWith('.mp3'));
      if (!mp3Path) {
        reject(new Error('yt-dlp não retornou o caminho do MP3 gerado.'));
        return;
      }

      try {
        await fs.access(mp3Path);
        logger.info(`[yt-dlp] MP3 gerado: ${mp3Path}`);
        resolve({ mp3Path });
      } catch {
        reject(new Error(`MP3 informado pelo yt-dlp não foi encontrado: ${mp3Path}`));
      }
    });
  });
}
