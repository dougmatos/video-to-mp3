/**
 * httpServer.ts
 * Servidor HTTP local que fornece uma interface web para converter
 * vídeos do YouTube em MP3 ou MP4.
 *
 * Rotas:
 *  GET  /               → Página HTML com o formulário de conversão
 *  POST /convert        → Inicia o processamento no formato escolhido
 *  GET  /download/:file → Transfere o arquivo gerado
 */

import http from 'http';
import path from 'path';
import fs from 'fs-extra';

import logger from '../utils/logger.js';
import { isValidYouTubeUrl } from '../utils/validateUrl.js';
import { downloadWithYtDlp } from '../services/ytDlpService.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// ---------------------------------------------------------------------------
// HTML da interface do usuário (embutido para evitar dependências de arquivos
// estáticos externos)
// ---------------------------------------------------------------------------
const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>video-to-mp3</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d0d0d;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 14px;
      padding: 2rem;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
    }
    .logo { font-size: 2rem; margin-bottom: 0.25rem; }
    h1 { font-size: 1.45rem; color: #fff; margin-bottom: 0.2rem; }
    .subtitle { font-size: 0.85rem; color: #666; margin-bottom: 1.75rem; }
    label { display: block; font-size: 0.8rem; color: #999; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em; }
    input[type="text"] {
      width: 100%;
      padding: 0.7rem 0.9rem;
      background: #111;
      border: 1px solid #333;
      border-radius: 8px;
      color: #fff;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus { border-color: #e74c3c; }
    input[type="text"]::placeholder { color: #444; }
    .format-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .format-option {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.8rem;
      background: #111;
      border: 1px solid #333;
      border-radius: 8px;
      color: #bbb;
      cursor: pointer;
      text-transform: none;
      letter-spacing: normal;
      transition: border-color 0.2s, color 0.2s;
    }
    .format-option:has(input:checked) { border-color: #e74c3c; color: #fff; }
    .format-option input { accent-color: #e74c3c; }
    button#btn {
      margin-top: 1rem;
      width: 100%;
      padding: 0.8rem;
      background: #e74c3c;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    button#btn:hover:not(:disabled) { background: #c0392b; }
    button#btn:active:not(:disabled) { transform: scale(0.98); }
    button#btn:disabled { background: #444; cursor: not-allowed; color: #888; }
    .status {
      margin-top: 1.25rem;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      line-height: 1.55;
      display: none;
    }
    .status.info  { background: #0e2233; border: 1px solid #1a4a70; color: #7bc8ea; }
    .status.error { background: #2b1010; border: 1px solid #6a1818; color: #e07070; }
    .status.done  { background: #0e2b0e; border: 1px solid #1a6a1a; color: #70e070; }
    .download-btn {
      display: inline-block;
      margin-top: 0.75rem;
      padding: 0.5rem 1.3rem;
      background: #27ae60;
      color: #fff;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.875rem;
      transition: background 0.2s;
    }
    .download-btn:hover { background: #1e8449; }
    .warning {
      margin-top: 1.5rem;
      font-size: 0.72rem;
      color: #555;
      line-height: 1.55;
      border-top: 1px solid #222;
      padding-top: 1rem;
    }
    .spinner {
      display: inline-block;
      width: 13px;
      height: 13px;
      border: 2px solid #7bc8ea;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.65s linear infinite;
      vertical-align: middle;
      margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🎬</div>
    <h1>Baixar vídeo do YouTube</h1>
    <p class="subtitle">Cole a URL e escolha entre áudio MP3 ou vídeo MP4</p>

    <label for="url">URL do YouTube</label>
    <input
      type="text"
      id="url"
      placeholder="https://www.youtube.com/watch?v=..."
      autocomplete="off"
      spellcheck="false"
    />

    <div class="format-options" role="radiogroup" aria-label="Formato do arquivo">
      <label class="format-option">
        <input type="radio" name="format" value="mp3" checked />
        <span>🎵 Áudio MP3</span>
      </label>
      <label class="format-option">
        <input type="radio" name="format" value="mp4" />
        <span>🎬 Vídeo MP4</span>
      </label>
    </div>

    <button id="btn" onclick="convert()">⬇️ Baixar MP3</button>

    <div class="status" id="status"></div>

    <p class="warning">
      ⚠️ Esta ferramenta destina-se exclusivamente ao uso pessoal e autorizado.
      Use somente para vídeos próprios, de domínio público, com licença compatível
      ou com permissão explícita do autor.
      O usuário é o único responsável pela legalidade de cada download.
    </p>
  </div>

  <script>
    const urlInput = document.getElementById('url');
    const btn      = document.getElementById('btn');
    const statusEl = document.getElementById('status');

    document.querySelectorAll('input[name="format"]').forEach(function(input) {
      input.addEventListener('change', function() {
        btn.textContent = '⬇️ Baixar ' + selectedFormat().toUpperCase();
      });
    });

    urlInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') convert();
    });

    async function convert() {
      const url = urlInput.value.trim();
      const format = selectedFormat();
      if (!url) { showStatus('info', 'Informe a URL do vídeo.'); return; }

      btn.disabled = true;
      showStatus('info', '<span class="spinner"></span> Preparando o arquivo ' + format.toUpperCase() + '… (pode levar alguns minutos)');

      try {
        const res  = await fetch('/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, format }),
        });
        const data = await res.json();

        if (!res.ok) {
          showStatus('error', '❌ ' + (data.error || 'Erro desconhecido.'));
        } else {
          const filename = data.filename;
          showStatus(
            'done',
            '✅ Arquivo pronto!<br>' +
            '<a class="download-btn" href="/download/' + encodeURIComponent(filename) + '" download="' + filename + '">⬇️ Baixar ' + format.toUpperCase() + '</a>'
          );
        }
      } catch (err) {
        console.error('[video-to-mp3] Erro de conexão:', err);
        showStatus('error', '❌ Não foi possível conectar ao servidor.');
      } finally {
        btn.disabled = false;
      }
    }

    function selectedFormat() {
      return document.querySelector('input[name="format"]:checked').value;
    }

    function showStatus(type, msg) {
      statusEl.className = 'status ' + type;
      statusEl.innerHTML = msg;
      statusEl.style.display = 'block';
    }
  </script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lê e analisa o corpo JSON de uma requisição. */
async function parseJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch (e) { reject(new Error(`Corpo da requisição não é um JSON válido: ${e instanceof Error ? e.message : String(e)}`)); }
    });
    req.on('error', reject);
  });
}

/** Envia uma resposta JSON. */
function sendJson(res: http.ServerResponse, statusCode: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

// ---------------------------------------------------------------------------
// Handlers de rota
// ---------------------------------------------------------------------------

/**
 * POST /convert
 * Recebe { url, format } no corpo JSON e gera um arquivo MP3 ou MP4.
 * Responde com { filename } em caso de sucesso ou { error } em caso de falha.
 */
async function handleConvert(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  let body: Record<string, unknown>;
  try {
    body = await parseJsonBody(req);
  } catch (err) {
    logger.warn(`[web] Falha ao analisar o corpo da requisição: ${err instanceof Error ? err.message : String(err)}`);
    sendJson(res, 400, { error: 'Requisição inválida.' });
    return;
  }

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const format = body.format === 'mp4' ? 'mp4' : body.format === 'mp3' ? 'mp3' : null;

  if (!url || !isValidYouTubeUrl(url)) {
    sendJson(res, 400, { error: 'URL inválida. Informe uma URL válida do YouTube.' });
    return;
  }

  if (!format) {
    sendJson(res, 400, { error: 'Formato inválido. Escolha MP3 ou MP4.' });
    return;
  }

  try {
    logger.info(`[web] Iniciando processamento em ${format.toUpperCase()}: ${url}`);

    const { filePath: finalPath } = await downloadWithYtDlp(url, format);

    const filename = path.basename(finalPath);
    logger.info(`[web] Processamento concluído: ${filename}`);
    sendJson(res, 200, { filename, format });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[web] Erro na conversão: ${message}`);
    sendJson(res, 500, { error: 'Falha ao processar a conversão. Verifique os logs do servidor para mais detalhes.' });
  }
}

/**
 * GET /download/:filename
 * Envia o arquivo gerado para o navegador do usuário.
 * Protege contra path traversal usando apenas o basename.
 */
async function handleDownload(
  res: http.ServerResponse,
  rawFilename: string,
): Promise<void> {
  // Usa somente o nome base para evitar path traversal
  const safe = path.basename(rawFilename);
  const filePath = path.resolve(process.cwd(), 'downloads', safe);

  try {
    const stat = await fs.stat(filePath);
    const extension = path.extname(safe).toLowerCase();
    const mimeType = extension === '.mp3'
      ? 'audio/mpeg'
      : extension === '.mp4'
        ? 'video/mp4'
        : 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    logger.error(`[web] Arquivo não encontrado: ${rawFilename} — ${err instanceof Error ? err.message : String(err)}`);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Arquivo não encontrado.');
  }
}

// ---------------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const url    = req.url   ?? '/';

  try {
    if (method === 'GET' && url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML);
      return;
    }

    if (method === 'POST' && url === '/convert') {
      await handleConvert(req, res);
      return;
    }

    if (method === 'GET' && url.startsWith('/download/')) {
      const filename = decodeURIComponent(url.slice('/download/'.length));
      await handleDownload(res, filename);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[web] Erro interno: ${message}`);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro interno do servidor.');
    }
  }
});

server.listen(PORT, () => {
  logger.info('\n╔══════════════════════════════════════════════════╗');
  logger.info('║      🎵  video-to-mp3 — Interface Web        ║');
  logger.info('╚══════════════════════════════════════════════════╝');
  logger.info(`\n🌐 Servidor iniciado em: http://localhost:${PORT}`);
  logger.info('   Abra o endereço acima no seu navegador.\n');
});
