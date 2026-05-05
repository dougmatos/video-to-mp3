#!/bin/bash
# init-letsencrypt.sh
# Verifica se já existe um certificado Let's Encrypt para yt.dougm.dev.
# Se não existir, cria um certificado temporário (auto-assinado) para permitir
# que o nginx suba, depois solicita o certificado real via certbot e recarrega
# o nginx.
#
# Uso: ./init-letsencrypt.sh [seu-email@example.com]
#
# Referência: https://github.com/wmnnd/nginx-certbot

set -e

DOMAIN="yt.dougm.dev"
EMAIL="${1:-}"                         # e-mail para notificações do Let's Encrypt
CERT_PATH="./certbot/conf/live/$DOMAIN"
STAGING=0                              # 1 = usa ambiente de testes (rate-limit menor)

# ─── Verificação de dependências ──────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "❌  Docker não encontrado. Instale o Docker antes de continuar."
  exit 1
fi

# ─── Certificado já existe → nada a fazer ─────────────────────────────────────
if [ -d "$CERT_PATH" ]; then
  echo "✅  Certificado já existe para $DOMAIN. Nenhuma ação necessária."
  echo "    Para forçar renovação antecipada, execute:"
  echo "    docker compose run --rm certbot renew --force-renewal"
  exit 0
fi

echo "🔐  Certificado Let's Encrypt não encontrado para $DOMAIN."
echo "    Iniciando processo de criação..."

# ─── Baixa parâmetros SSL recomendados pelo Certbot ───────────────────────────
mkdir -p ./certbot/conf
if [ ! -f "./certbot/conf/options-ssl-nginx.conf" ]; then
  echo "⬇️   Baixando options-ssl-nginx.conf..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o ./certbot/conf/options-ssl-nginx.conf
fi
if [ ! -f "./certbot/conf/ssl-dhparams.pem" ]; then
  echo "⬇️   Baixando ssl-dhparams.pem..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
    -o ./certbot/conf/ssl-dhparams.pem
fi

# ─── Cria certificado auto-assinado temporário ────────────────────────────────
echo "🔧  Criando certificado temporário para $DOMAIN..."
mkdir -p "$CERT_PATH"
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  --entrypoint openssl \
  certbot/certbot req -x509 -nodes -newkey rsa:4096 \
    -keyout "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
    -out    "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
    -days 1 -subj "/CN=$DOMAIN" 2>/dev/null

# ─── Sobe o nginx com o certificado temporário ────────────────────────────────
echo "🚀  Iniciando nginx com certificado temporário..."
docker compose up --force-recreate -d nginx

# ─── Apaga o certificado temporário ──────────────────────────────────────────
echo "🗑️   Removendo certificado temporário..."
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  --entrypoint rm \
  certbot/certbot -rf \
    "/etc/letsencrypt/live/$DOMAIN" \
    "/etc/letsencrypt/archive/$DOMAIN" \
    "/etc/letsencrypt/renewal/$DOMAIN.conf"

# ─── Solicita o certificado real ──────────────────────────────────────────────
echo "📜  Solicitando certificado Let's Encrypt para $DOMAIN..."

STAGING_FLAG=""
[ "$STAGING" -eq 1 ] && STAGING_FLAG="--staging"

EMAIL_FLAG="--register-unsafely-without-email"
[ -n "$EMAIL" ] && EMAIL_FLAG="--email $EMAIL"

docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  $STAGING_FLAG \
  $EMAIL_FLAG \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# ─── Recarrega o nginx com o certificado real ─────────────────────────────────
echo "🔄  Recarregando nginx com certificado válido..."
docker compose exec nginx nginx -s reload

echo ""
echo "✅  Pronto! Certificado Let's Encrypt criado com sucesso para $DOMAIN."
echo "    O serviço está disponível em: https://$DOMAIN"
