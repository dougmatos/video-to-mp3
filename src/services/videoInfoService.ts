/**
 * videoInfoService.ts
 * Responsável por buscar e retornar os metadados de um vídeo do YouTube.
 * Utiliza @distube/ytdl-core para obter informações sem iniciar o download.
 */

import ytdl from '@distube/ytdl-core';
import logger from '../utils/logger';

/** Representa os metadados básicos de um vídeo. */
export interface VideoInfo {
  title: string;
  channel: string;
  durationSeconds: number;
  durationFormatted: string;
  license: string;
  audioFormats: AudioFormat[];
}

/** Representa um formato de áudio disponível. */
export interface AudioFormat {
  itag: number;
  mimeType: string;
  container: string;
  codecs: string;
  audioBitrate: number | null;
  audioSampleRate: string | undefined;
}

/**
 * Formata segundos em string legível (HH:MM:SS ou MM:SS).
 */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Obtém metadados do vídeo a partir da URL do YouTube.
 * @param url - URL pública do vídeo.
 * @returns Objeto com título, canal, duração, licença e formatos de áudio.
 * @throws Erro se a URL for inválida ou o vídeo não estiver acessível.
 */
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  logger.info(`Buscando informações do vídeo: ${url}`);

  let info: ytdl.videoInfo;
  try {
    info = await ytdl.getInfo(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Falha ao obter informações do vídeo: ${message}`);
    throw new Error(`Não foi possível obter informações do vídeo. ${message}`);
  }

  const details = info.videoDetails;

  // Filtra apenas formatos que possuem áudio (sem vídeo)
  const rawAudioFormats = ytdl.filterFormats(info.formats, 'audioonly');

  const audioFormats: AudioFormat[] = rawAudioFormats.map((f) => {
    const mimeType = f.mimeType ?? 'unknown';
    // Extrai container e codecs da mimeType (ex: "audio/webm; codecs=\"opus\"")
    const mimeMatch = mimeType.match(/^([^;]+)(?:;\s*codecs="([^"]+)")?/);
    const container = mimeMatch ? mimeMatch[1].split('/')[1] ?? 'unknown' : 'unknown';
    const codecs = mimeMatch ? (mimeMatch[2] ?? 'unknown') : 'unknown';

    return {
      itag: f.itag,
      mimeType,
      container,
      codecs,
      audioBitrate: f.audioBitrate ?? null,
      audioSampleRate: f.audioSampleRate,
    };
  });

  const durationSeconds = parseInt(details.lengthSeconds, 10);

  return {
    title: details.title,
    channel: details.author?.name ?? 'Desconhecido',
    durationSeconds,
    durationFormatted: formatDuration(durationSeconds),
    license: details.media?.licensed_by ?? 'Licença padrão do YouTube',
    audioFormats,
  };
}

/**
 * Seleciona o melhor formato de áudio disponível.
 * Prioriza maior bitrate; em caso de empate, prefere m4a/aac sobre webm/opus.
 *
 * @param formats - Lista de formatos de áudio disponíveis.
 * @returns O formato de áudio de maior qualidade.
 */
export function selectBestAudioFormat(formats: AudioFormat[]): AudioFormat {
  if (formats.length === 0) {
    throw new Error('Nenhum formato de áudio disponível para este vídeo.');
  }

  // Ordena por bitrate descendente, priorizando formatos com bitrate conhecido
  const sorted = [...formats].sort((a, b) => {
    const bitrateA = a.audioBitrate ?? 0;
    const bitrateB = b.audioBitrate ?? 0;
    if (bitrateB !== bitrateA) return bitrateB - bitrateA;
    // Em caso de empate, prefere m4a (compatibilidade mais ampla)
    if (a.container === 'm4a') return -1;
    if (b.container === 'm4a') return 1;
    return 0;
  });

  return sorted[0];
}
