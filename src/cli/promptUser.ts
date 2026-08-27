/**
 * promptUser.ts
 * Módulo de interação com o usuário via CLI usando o Inquirer.
 * Gerencia todas as perguntas necessárias antes e depois do download.
 */

import inquirer from 'inquirer';
import { isValidYouTubeUrl } from '../utils/validateUrl.js';
import { VideoInfo, AudioFormat } from '../services/videoInfoService.js';

/**
 * Solicita ao usuário que informe a URL do vídeo do YouTube.
 * Repete a pergunta se a URL informada for inválida.
 *
 * @returns A URL válida fornecida pelo usuário.
 */
export async function askForUrl(): Promise<string> {
  const { url } = await inquirer.prompt<{ url: string }>([
    {
      type: 'input',
      name: 'url',
      message: 'Informe a URL do vídeo do YouTube:',
      validate(input: string) {
        if (!input.trim()) return 'A URL não pode ser vazia.';
        if (!isValidYouTubeUrl(input.trim())) {
          return 'URL inválida. Informe uma URL válida do YouTube (ex: https://www.youtube.com/watch?v=...).';
        }
        return true;
      },
    },
  ]);
  return url.trim();
}

/**
 * Exibe os metadados do vídeo e solicita a confirmação de autorização.
 * O download só prossegue se o usuário confirmar explicitamente.
 *
 * @param info - Informações do vídeo obtidas pelo videoInfoService.
 * @returns true se o usuário confirmar autorização, false caso contrário.
 */
export async function confirmAuthorization(info: VideoInfo): Promise<boolean> {
  console.log('\n─────────────────────────────────────────');
  console.log('  Informações do vídeo:');
  console.log(`  Título   : ${info.title}`);
  console.log(`  Canal    : ${info.channel}`);
  console.log(`  Duração  : ${info.durationFormatted}`);
  console.log(`  Licença  : ${info.license}`);
  console.log(`  Formatos de áudio disponíveis: ${info.audioFormats.length}`);
  info.audioFormats.forEach((f: AudioFormat) => {
    console.log(
      `    • [itag ${f.itag}] ${f.container.toUpperCase()} / ${f.codecs} — ${f.audioBitrate ?? '?'} kbps`
    );
  });
  console.log('─────────────────────────────────────────\n');

  // Aviso legal obrigatório antes da confirmação
  console.log('⚠️  AVISO LEGAL: Esta ferramenta deve ser usada APENAS com vídeos para os quais');
  console.log('   você possui autorização explícita (vídeos próprios, domínio público,');
  console.log('   licença compatível ou permissão do autor).\n');

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Você confirma que possui autorização para baixar o áudio deste vídeo?',
      default: false,
    },
  ]);

  return confirmed;
}

/**
 * Pergunta se o usuário deseja converter o áudio baixado para MP3.
 *
 * @returns true se o usuário quiser converter para MP3, false para manter o formato original.
 */
export async function askForMp3Conversion(): Promise<boolean> {
  const { convert } = await inquirer.prompt<{ convert: boolean }>([
    {
      type: 'confirm',
      name: 'convert',
      message: 'Deseja converter o áudio para MP3 usando FFmpeg?',
      default: false,
    },
  ]);

  return convert;
}
