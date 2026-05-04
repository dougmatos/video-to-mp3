/**
 * validateUrl.ts
 * Valida se a URL fornecida é uma URL válida do YouTube.
 * Aceita formatos padrão como youtube.com/watch?v=... e youtu.be/...
 */

/**
 * Verifica se a string informada é uma URL válida do YouTube.
 * @param url - A URL a ser verificada.
 * @returns true se for uma URL do YouTube válida, false caso contrário.
 */
export function isValidYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    const isYouTubeDomain =
      parsed.hostname === 'www.youtube.com' ||
      parsed.hostname === 'youtube.com' ||
      parsed.hostname === 'youtu.be' ||
      parsed.hostname === 'm.youtube.com';

    if (!isYouTubeDomain) return false;

    // youtu.be/<videoId>
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.length > 1;
    }

    // youtube.com/watch?v=<videoId>
    if (parsed.pathname === '/watch') {
      return parsed.searchParams.has('v') && (parsed.searchParams.get('v') ?? '').length > 0;
    }

    // youtube.com/shorts/<videoId>
    if (parsed.pathname.startsWith('/shorts/')) {
      return parsed.pathname.split('/').filter(Boolean).length >= 2;
    }

    return false;
  } catch {
    // URL inválida — não conseguiu ser parseada
    return false;
  }
}

/**
 * Extrai o ID do vídeo de uma URL do YouTube.
 * @param url - URL do YouTube.
 * @returns O video ID ou null se não encontrado.
 */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1) || null;
    }

    if (parsed.pathname === '/watch') {
      return parsed.searchParams.get('v');
    }

    if (parsed.pathname.startsWith('/shorts/')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      return parts[1] ?? null;
    }

    return null;
  } catch {
    return null;
  }
}
