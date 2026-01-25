#!/bin/bash
# Server setup script for DigiEd@VT website
# Run with: sudo bash setup-server.sh

set -e

echo "=== Installing nginx ==="
apt update
apt install -y nginx

echo "=== Copying nginx configuration ==="
cp /home/dhsmith4/digitaledu-website/nginx-digitaled.conf /etc/nginx/sites-available/digitaled

echo "=== Enabling site ==="
ln -sf /etc/nginx/sites-available/digitaled /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "=== Testing nginx configuration ==="
nginx -t

echo "=== Enabling and starting nginx ==="
systemctl enable nginx
systemctl restart nginx

echo "=== Setting permissions ==="
chmod 755 /home/dhsmith4
chmod -R 755 /home/dhsmith4/digitaledu-website/dist

echo "=== Installing pm2 globally ==="
npm install -g pm2

echo "=== Setup complete! ==="
echo ""
echo "Now run these commands as your regular user (not root):"
echo "  cd /home/dhsmith4/digitaledu-website"
echo "  export NVM_DIR=\"\$HOME/.nvm\" && [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\""
echo "  pm2 start webhook-server.cjs --name digitaled-webhook"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
echo "Then run the command pm2 startup outputs to enable auto-start on boot."
