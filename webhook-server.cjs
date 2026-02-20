const http = require('http');
const { exec } = require('child_process');
const path = require('path');

const PORT = 3001;
const PROJECT_DIR = path.dirname(__filename);
const SECRET_TOKEN = process.env.WEBHOOK_SECRET;

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/') {
        // Optional: Verify secret token (only check if SECRET_TOKEN is configured)
        const authHeader = req.headers['x-webhook-secret'];
        if (SECRET_TOKEN && authHeader !== SECRET_TOKEN) {
            res.writeHead(401);
            res.end('Unauthorized');
            return;
        }

        console.log(`[${new Date().toISOString()}] Rebuild triggered`);

        // Source nvm and use the correct Node version for the build
        const buildCmd = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 20 && npm run build`;

        exec(buildCmd, { cwd: PROJECT_DIR, shell: '/bin/bash' }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Build failed: ${error.message}`);
                console.error(stderr);
            } else {
                console.log('Build completed successfully');
                console.log(stdout);
            }
        });

        res.writeHead(200);
        res.end('Build triggered');
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Webhook server listening on port ${PORT}`);
});
