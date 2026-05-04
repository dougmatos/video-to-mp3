/**
 * sanitizeFilename.ts
 * Remove ou substitui caracteres inválidos em nomes de arquivo.
 * Usa a biblioteca `sanitize-filename` como base e aplica limpezas adicionais.
 */

import sanitize from 'sanitize-filename';

/**
 * Limpa o nome de arquivo removendo caracteres inválidos,
 * substituindo espaços por underscores e truncando para 200 caracteres.
 *
 * @param filename - Nome de arquivo bruto.
 * @returns Nome de arquivo seguro para uso no sistema de arquivos.
 */
export function sanitizeFilename(filename: string): string {
  // Remove caracteres proibidos em sistemas de arquivo comuns
  let safe = sanitize(filename, { replacement: '_' });

  // Substitui espaços por underscores para melhor compatibilidade
  safe = safe.replace(/\s+/g, '_');

  // Remove pontos consecutivos que podem criar diretórios relativos
  safe = safe.replace(/\.{2,}/g, '_');

  // Trunca o nome para evitar caminhos muito longos (limite seguro: 200 chars)
  safe = safe.slice(0, 200);

  // Caso resulte em string vazia, usa um nome genérico
  if (!safe || safe.trim() === '') {
    safe = 'audio_download';
  }

  return safe;
}
