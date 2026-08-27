/**
 * index.ts
 * Ponto de entrada principal da aplicação video-to-mp3.
 *
 * Fluxo:
 *  1. Exibe banner e aviso legal
 *  2. Solicita URL do YouTube ao usuário
 *  3. Busca metadados do vídeo
 *  4. Solicita confirmação de autorização
 *  5. Realiza download do melhor áudio disponível
 *  6. Opcionalmente converte para MP3
 *  7. Exibe o caminho do arquivo final
 */

import logger from './utils/logger.js';
import { askForUrl, confirmAuthorization, askForMp3Conversion } from './cli/promptUser.js';
import { getVideoInfo, selectBestAudioFormat } from './services/videoInfoService.js';
import { downloadAudio } from './services/audioDownloadService.js';
import { convertToMp3, isFfmpegAvailable } from './services/ffmpegService.js';

/** Exibe o banner de boas-vindas e aviso legal no início da aplicação. */
function showBanner(): void {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║          🎵  video-to-mp3 — Downloader           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('\n⚠️  AVISO IMPORTANTE:');
  console.log('   Esta ferramenta destina-se EXCLUSIVAMENTE ao uso pessoal e autorizado.');
  console.log('   Use somente para baixar vídeos próprios, de domínio público,');
  console.log('   com licença compatível ou com permissão explícita do autor.');
  console.log('   O usuário é o único responsável pela legalidade de cada download.\n');
}

/** Função principal que orquestra todo o fluxo da aplicação. */
async function main(): Promise<void> {
  showBanner();

  try {
    // 1. Obtém a URL do vídeo
    const url = await askForUrl();

    // 2. Busca metadados do vídeo
    console.log('\n🔍 Buscando informações do vídeo…\n');
    const videoInfo = await getVideoInfo(url);

    // 3. Seleciona o melhor formato de áudio
    const bestFormat = selectBestAudioFormat(videoInfo.audioFormats);

    // 4. Solicita confirmação de autorização (obrigatória)
    const authorized = await confirmAuthorization(videoInfo);
    if (!authorized) {
      console.log('\n❌ Download cancelado. Nenhuma autorização confirmada.\n');
      process.exit(0);
    }

    // 5. Realiza o download do áudio
    console.log(`\n⬇️  Baixando áudio em ${bestFormat.container.toUpperCase()} (${bestFormat.audioBitrate ?? '?'} kbps)…\n`);

    const { filePath } = await downloadAudio({
      url,
      itag: bestFormat.itag,
      title: videoInfo.title,
      extension: bestFormat.container,
    });

    // 6. Pergunta sobre conversão para MP3
    const wantsMp3 = await askForMp3Conversion();

    if (wantsMp3) {
      // Verifica se o FFmpeg está disponível antes de tentar converter
      const ffmpegOk = await isFfmpegAvailable();
      if (!ffmpegOk) {
        console.log('\n⚠️  FFmpeg não encontrado no sistema. Mantendo formato original.');
        console.log('   Instale o FFmpeg (https://ffmpeg.org/download.html) e tente novamente.\n');
        console.log(`✅ Arquivo salvo em: ${filePath}\n`);
      } else {
        console.log('\n🔄 Iniciando conversão para MP3…\n');
        const { mp3Path } = await convertToMp3(filePath);
        console.log(`\n✅ Arquivo MP3 salvo em: ${mp3Path}\n`);
      }
    } else {
      console.log(`\n✅ Arquivo salvo em: ${filePath}\n`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(message);
    console.error(`\n❌ Erro: ${message}\n`);
    process.exit(1);
  }
}

// Inicia a aplicação
main();
