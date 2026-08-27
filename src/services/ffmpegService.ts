/**
 * ffmpegService.ts
 * Serviço opcional de conversão de áudio para MP3 usando FFmpeg (via fluent-ffmpeg).
 * Realiza a conversão sem recompressão desnecessária quando possível,
 * ou usa a melhor qualidade disponível quando a conversão é necessária.
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs-extra';
import logger from '../utils/logger.js';

/** Resultado da conversão para MP3. */
export interface ConversionResult {
  /** Caminho completo do arquivo MP3 gerado. */
  mp3Path: string;
}

/**
 * Converte um arquivo de áudio para MP3 usando FFmpeg.
 * Usa taxa de bits variável (VBR) de alta qualidade (q:a 0 ≈ 320 kbps).
 *
 * @param inputPath - Caminho do arquivo de áudio de entrada.
 * @returns Resultado com o caminho do arquivo MP3 gerado.
 * @throws Erro se o FFmpeg não estiver instalado ou se a conversão falhar.
 */
export async function convertToMp3(inputPath: string): Promise<ConversionResult> {
  // Troca a extensão do arquivo de entrada por .mp3
  const mp3Path = inputPath.replace(/\.[^.]+$/, '.mp3');

  logger.info(`Convertendo "${path.basename(inputPath)}" para MP3…`);

  return new Promise<ConversionResult>((resolve, reject) => {
    ffmpeg(inputPath)
      // Codec MP3 com qualidade VBR máxima (0 = melhor qualidade)
      .audioCodec('libmp3lame')
      .audioQuality(0)
      .format('mp3')
      .on('progress', (progress: { percent?: number }) => {
        if (progress.percent !== undefined) {
          process.stdout.write(`\r  Convertendo: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', async () => {
        process.stdout.write('\n');
        logger.info(`Conversão concluída: ${mp3Path}`);

        // Remove o arquivo original após conversão bem-sucedida
        try {
          await fs.remove(inputPath);
          logger.info(`Arquivo original removido: ${inputPath}`);
        } catch (removeErr) {
          const msg = removeErr instanceof Error ? removeErr.message : String(removeErr);
          logger.error(`Não foi possível remover o arquivo original: ${msg}`);
          // Não falha o processo por causa disso
        }

        resolve({ mp3Path });
      })
      .on('error', (err: Error) => {
        logger.error(`Erro na conversão FFmpeg: ${err.message}`);
        reject(
          new Error(
            `Falha na conversão para MP3. Verifique se o FFmpeg está instalado.\n${err.message}`
          )
        );
      })
      .save(mp3Path);
  });
}

/**
 * Verifica se o FFmpeg está disponível no sistema.
 * @returns true se o FFmpeg estiver acessível, false caso contrário.
 */
export async function isFfmpegAvailable(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
}
