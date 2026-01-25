const http = require('http');
const { exec } = require('child_process');
const path = require('path');

const PORT = 3001;
const PROJECT_DIR = '/home/dhsmith4/digitaledu-website';
const SECRET_TOKEN = process.env.WEBHOOK_SECRET || 'your-secret-token-here';

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/') {
        // Optional: Verify secret token
        const authHeader = req.headers['x-webhook-secret'];
        if (SECRET_TOKEN !== 'your-secret-token-here' && authHeader !== SECRET_TOKEN) {
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
