#!/bin/bash
# Paganini AIOS — POC HTTPS Setup
# Sets up Nginx reverse proxy + Let's Encrypt SSL
# Run on EC2: sudo bash setup-poc-https.sh <domain>

set -euo pipefail

DOMAIN="${1:-poc.paganini.ai}"
EMAIL="${2:-art@vivaldi.finance}"
UPSTREAM_PORT=8000

echo "=== Paganini AIOS — POC HTTPS Setup ==="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Upstream: localhost:$UPSTREAM_PORT"
echo ""

# 1. Install Nginx + Certbot
echo "[1/5] Installing Nginx + Certbot..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

# 2. Nginx config (HTTP first, certbot will add SSL)
echo "[2/5] Configuring Nginx..."
cat > /etc/nginx/sites-available/paganini << NGINX_EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Health check (Nginx level)
    location /health {
        return 200 '{"status":"ok","service":"paganini-aios"}';
        add_header Content-Type application/json;
    }

    # API proxy
    location / {
        proxy_pass http://127.0.0.1:$UPSTREAM_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Timeouts for LLM queries (can be slow)
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;

        # CORS (for SPA dashboard)
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        if (\$request_method = OPTIONS) {
            return 204;
        }
    }

    # Rate limiting for API
    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;
    location /api/query {
        limit_req zone=api burst=5 nodelay;
        proxy_pass http://127.0.0.1:$UPSTREAM_PORT;
        proxy_read_timeout 120s;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/paganini /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# 3. Start Nginx
echo "[3/5] Starting Nginx..."
systemctl enable nginx
systemctl restart nginx

# 4. SSL Certificate
echo "[4/5] Obtaining SSL certificate..."
echo "NOTE: DNS for $DOMAIN must point to this server's IP first!"
echo "      A record: $DOMAIN -> $(curl -s ifconfig.me)"
echo ""

# Check if domain resolves to this IP
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN 2>/dev/null || echo "unresolved")

if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
    certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --no-eff-email --redirect
    echo "[4/5] ✅ SSL certificate obtained!"
else
    echo "[4/5] ⚠️ DNS not configured yet."
    echo "      Server IP: $SERVER_IP"
    echo "      Domain resolves to: $DOMAIN_IP"
    echo ""
    echo "      After configuring DNS, run:"
    echo "      sudo certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --redirect"
    echo ""
    echo "      For now, HTTP is working at: http://$SERVER_IP"
fi

# 5. Basic Auth (optional, for POC security)
echo "[5/5] Setting up basic auth..."
apt-get install -y -qq apache2-utils

# Create POC user
POC_PASS=$(openssl rand -base64 12)
htpasswd -bc /etc/nginx/.htpasswd poc "$POC_PASS"

echo ""
echo "Basic auth credentials (save these!):"
echo "  Username: poc"
echo "  Password: $POC_PASS"
echo ""
echo "To enable basic auth, add to the Nginx server block:"
echo '  auth_basic "Paganini AIOS POC";'
echo '  auth_basic_user_file /etc/nginx/.htpasswd;'
echo ""

# Summary
echo "=== Setup Complete ==="
echo "HTTP:  http://$DOMAIN (or http://$SERVER_IP)"
echo "HTTPS: https://$DOMAIN (after DNS + certbot)"
echo ""
echo "Dashboard: http://$SERVER_IP:$UPSTREAM_PORT (direct, no auth)"
echo "Proxy:     http://$SERVER_IP (via Nginx, with rate limiting)"
echo ""
echo "Endpoints:"
echo "  GET  /api/status    — System status"
echo "  GET  /api/query?q=  — RAG query with guardrails"
echo "  GET  /api/alerts    — Alert timeline"
echo "  GET  /api/market    — BCB market data"
echo "  GET  /api/agents    — Agent registry"
echo "  GET  /api/daemons/history — Daemon execution log"
echo "  GET  /health        — Nginx health check"
