# 🎵 video-to-mp3

Ferramenta CLI local em Node.js + TypeScript para download de áudio de vídeos do YouTube **exclusivamente autorizados** — vídeos próprios, de domínio público, com licença compatível ou com permissão explícita do autor.

---

## ⚠️ Aviso Legal

> **Esta ferramenta destina-se somente ao uso pessoal e em conformidade com as leis de direitos autorais.**
>
> - Use apenas para vídeos para os quais você possui autorização explícita.
> - O usuário é o **único responsável** por garantir que possui autorização para baixar cada conteúdo.
> - Esta aplicação **não deve ser usada** para contornar DRM, acessar conteúdo pago, de membros ou privado, nem para download em massa.
> - O uso indevido pode violar os [Termos de Serviço do YouTube](https://www.youtube.com/t/terms) e leis de direitos autorais locais.

---

## 📋 Funcionalidades

- ✅ Solicita URL do YouTube via terminal
- ✅ Exibe metadados do vídeo (título, canal, duração, licença, formatos disponíveis)
- ✅ Exige confirmação explícita de autorização antes de qualquer download
- ✅ Baixa o melhor stream de áudio disponível (maior bitrate)
- ✅ Salva no formato original (`.webm`, `.m4a`, `.opus`) sem recompressão
- ✅ Conversão opcional para `.mp3` via FFmpeg (VBR alta qualidade)
- ✅ Exibe progresso do download em tempo real
- ✅ Sanitiza nomes de arquivo para evitar caracteres inválidos
- ✅ Gera logs de erro em `logs/`

---

## 🛠️ Pré-requisitos

### Node.js

Requer **Node.js 18+**. Verifique com:

```bash
node --version
```

Instale em [nodejs.org](https://nodejs.org/).

### FFmpeg (opcional — necessário para conversão para MP3)

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows:**
1. Baixe em [ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Extraia o arquivo e adicione a pasta `bin` ao PATH do sistema
3. Verifique: `ffmpeg -version`

---

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/dougmatos/video-to-mp3.git
cd video-to-mp3

# Instale as dependências
npm install
```

---

## 🚀 Uso

### Modo de desenvolvimento (sem compilação)

```bash
npm run dev
```

### Modo produção (após build)

```bash
# Compila o TypeScript
npm run build

# Executa o binário compilado
npm start
```

### Fluxo interativo

```
╔══════════════════════════════════════════════════╗
║          🎵  video-to-mp3 — Downloader           ║
╚══════════════════════════════════════════════════╝

⚠️  AVISO IMPORTANTE: ...

? Informe a URL do vídeo do YouTube: https://www.youtube.com/watch?v=EXEMPLO

🔍 Buscando informações do vídeo…

─────────────────────────────────────────
  Informações do vídeo:
  Título   : Minha Música
  Canal    : Meu Canal
  Duração  : 3:42
  Licença  : Creative Commons
  Formatos de áudio disponíveis: 3
    • [itag 251] WEBM / opus — 160 kbps
    • [itag 140] M4A / mp4a.40.2 — 128 kbps
    • [itag 139] M4A / mp4a.40.5 — 48 kbps
─────────────────────────────────────────

⚠️  AVISO LEGAL: ...

? Você confirma que possui autorização para baixar o áudio deste vídeo? (s/N) s

⬇️  Baixando áudio em WEBM (160 kbps)…

  Progresso: 100.0% (4.23 MB / 4.23 MB)

? Deseja converter o áudio para MP3 usando FFmpeg? (s/N) s

🔄 Iniciando conversão para MP3…

  Convertendo: 100.0%

✅ Arquivo MP3 salvo em: /caminho/para/downloads/Minha_Musica.mp3
```

Os arquivos são salvos na pasta `downloads/` na raiz do projeto.

---

## 🖥️ Deploy em VPS (Docker + HTTPS)

Esta seção descreve como rodar o projeto em um servidor VPS com HTTPS automático via **Let's Encrypt**, usando **Docker Compose**, **Nginx** como proxy reverso e **Certbot** para gerenciamento de certificados.

### Pré-requisitos no servidor

- **Docker** 24+ e **Docker Compose** v2
- Porta **80** e **443** abertas no firewall
- DNS do domínio `yt.dougm.dev` apontando para o IP do VPS

Instale o Docker em Ubuntu/Debian:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 1. Clone o repositório

```bash
git clone https://github.com/dougmatos/video-to-mp3.git
cd video-to-mp3
```

### 2. Inicialize o certificado Let's Encrypt

O script `init-letsencrypt.sh` verifica se o certificado já existe. Se não existir, ele cria um certificado auto-assinado temporário, sobe o nginx, solicita o certificado real ao Let's Encrypt e recarrega o nginx.

```bash
# (Opcional) passe seu e-mail para receber alertas de expiração
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh seu-email@example.com
```

> **Atenção:** o DNS do domínio `yt.dougm.dev` precisa estar propagado e apontando para o IP do VPS antes de executar este script.

### 3. Suba todos os serviços

```bash
docker compose up -d
```

O servidor web estará acessível em **https://yt.dougm.dev**.

### Serviços em execução

| Serviço  | Descrição                                   | Porta interna |
|----------|---------------------------------------------|---------------|
| `app`    | Servidor Node.js (video-to-mp3)             | 3092          |
| `nginx`  | Proxy reverso (HTTP→HTTPS, roteamento)      | 80, 443       |
| `certbot`| Renovação automática de certificados SSL    | —             |

### Fluxo de requisição

```
Usuário → HTTPS :443 → Nginx → HTTP :3092 → App Node.js
```

O nginx redireciona automaticamente todo o tráfego HTTP (porta 80) para HTTPS (porta 443) e faz o proxy reverso para o app na porta 3092.

### Renovação automática de certificados

O serviço `certbot` renova o certificado automaticamente a cada 12 horas (quando necessário). O `nginx` recarrega sua configuração a cada 6 horas para usar o certificado renovado. Nenhuma intervenção manual é necessária.

Para verificar o status dos serviços:
```bash
docker compose ps
docker compose logs -f app
```

Para forçar uma renovação imediata do certificado:
```bash
docker compose run --rm certbot renew --force-renewal
docker compose exec nginx nginx -s reload
```

### Estrutura de arquivos gerada no VPS

```
video-to-mp3/
├── certbot/
│   ├── conf/          # Certificados e configurações SSL
│   └── www/           # Arquivos temporários de desafio ACME
├── downloads/         # Áudios convertidos (volume persistente)
├── logs/              # Logs da aplicação (volume persistente)
├── nginx/
│   └── nginx.conf     # Configuração do Nginx
├── docker-compose.yml
├── Dockerfile
└── init-letsencrypt.sh
```

---

## 📁 Estrutura do Projeto

```
video-to-mp3/
├── src/
│   ├── index.ts                    # Ponto de entrada e orquestrador
│   ├── cli/
│   │   └── promptUser.ts           # Interação com o usuário via terminal
│   ├── services/
│   │   ├── videoInfoService.ts     # Busca metadados do vídeo
│   │   ├── audioDownloadService.ts # Realiza o download do áudio
│   │   └── ffmpegService.ts        # Conversão para MP3 via FFmpeg
│   ├── server/
│   │   └── httpServer.ts           # Servidor HTTP com interface web (porta 3092)
│   └── utils/
│       ├── logger.ts               # Logger (Winston)
│       ├── validateUrl.ts          # Validação de URL do YouTube
│       └── sanitizeFilename.ts     # Sanitização de nomes de arquivo
├── nginx/
│   └── nginx.conf                  # Configuração do Nginx (proxy reverso + HTTPS)
├── downloads/                      # Arquivos de áudio baixados
├── logs/                           # Logs de erro (gerado em runtime)
├── dist/                           # Código compilado (gerado pelo build)
├── Dockerfile                      # Imagem Docker do app (porta 3092)
├── docker-compose.yml              # Orquestração: app + nginx + certbot
├── init-letsencrypt.sh             # Inicializa certificado Let's Encrypt
├── .dockerignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📜 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Executa CLI diretamente com `tsx` (sem build) |
| `npm run web` | Inicia o servidor web na porta 3000 (ou `$PORT`) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa o build compilado (CLI) |

---

## 🔒 O que esta ferramenta NÃO faz

- ❌ Não baixa playlists em massa
- ❌ Não acessa vídeos privados
- ❌ Não remove DRM ou proteções de cópia
- ❌ Não contorna bloqueios ou paywalls
- ❌ Não baixa conteúdo de membros ou pago
- ✅ Possui interface web acessível via navegador (`npm run web`)

---

## 📝 Licença

ISC — Veja o arquivo `LICENSE` para detalhes.

O usuário assume total responsabilidade pelo uso desta ferramenta em conformidade com as leis aplicáveis.
