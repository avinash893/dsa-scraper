import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { ScraperOrchestrator, loadDatabase, saveDatabase } from './scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const PORT = process.env.PORT || 3005;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store WebSocket clients
const clients = new Set();

// Broadcast data to all WebSocket clients
function broadcast(data) {
    const payload = JSON.stringify(data);
    for (const client of clients) {
        if (client.readyState === 1) { // OPEN
            client.send(payload);
        }
    }
}

// Initialize Scraper Orchestrator
const orchestrator = new ScraperOrchestrator(broadcast);

// HTTP Upgrade to WebSocket
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

wss.on('connection', (ws) => {
    clients.add(ws);
    
    // Send current status on connect
    ws.send(JSON.stringify({
        type: 'status',
        data: {
            status: orchestrator.isRunning ? (orchestrator.isPaused ? 'paused' : 'running') : 'idle'
        }
    }));
    
    // Trigger initial progress send
    orchestrator.sendProgress();

    ws.on('close', () => {
        clients.delete(ws);
    });
});

// API Routes
app.get('/api/sheet', (req, res) => {
    try {
        const db = loadDatabase();
        res.json(db);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/start', async (req, res) => {
    const { problems } = req.body; // Array of problem IDs (optional)
    if (orchestrator.isRunning) {
        return res.status(400).json({ error: 'Scraper is already running' });
    }
    
    // Run async in background
    orchestrator.start(problems).catch(err => {
        console.error('Orchestrator start error:', err);
    });
    
    res.json({ success: true, message: 'Scraper started' });
});

app.post('/api/pause', (req, res) => {
    orchestrator.pause();
    res.json({ success: true, message: 'Scraper paused' });
});

app.post('/api/resume', (req, res) => {
    orchestrator.resume();
    res.json({ success: true, message: 'Scraper resumed' });
});

app.post('/api/stop', async (req, res) => {
    await orchestrator.stop();
    res.json({ success: true, message: 'Scraper stopped' });
});

app.get('/api/status', (req, res) => {
    res.json({
        status: orchestrator.isRunning ? (orchestrator.isPaused ? 'paused' : 'running') : 'idle',
        isRunning: orchestrator.isRunning,
        isPaused: orchestrator.isPaused
    });
});

// Helper function to sanitize folder names (remove invalid characters)
function sanitizePathName(name) {
    if (!name) return '';
    return name
        .replace(/[\r\n\t]/g, ' ')
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
}

app.post('/api/export', (req, res) => {
    try {
        const db = loadDatabase();
        const outputDir = path.join(__dirname, 'output');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        let fileCount = 0;
        const extensionMap = {
            'cpp': '.cpp',
            'c++': '.cpp',
            'java': '.java',
            'python': '.py',
            'py': '.py',
            'javascript': '.js',
            'js': '.js',
            'c#': '.cs',
            'csharp': '.cs'
        };

        db.forEach((category, catIdx) => {
            const catName = `${String(catIdx + 1).padStart(2, '0')}. ${sanitizePathName(category.category_name)}`;
            const catPath = path.join(outputDir, catName);

            category.subcategories.forEach((sub, subIdx) => {
                const subName = `${String(subIdx + 1).padStart(2, '0')}. ${sanitizePathName(sub.subcategory_name)}`;
                const subPath = path.join(catPath, subName);

                sub.problems.forEach((prob) => {
                    if (prob.scraped && prob.solutions) {
                        const probName = sanitizePathName(prob.problem_name);
                        const probPath = path.join(subPath, probName);

                        // Create directories recursively
                        fs.mkdirSync(probPath, { recursive: true });

                        // Export solutions
                        Object.entries(prob.solutions).forEach(([approachName, approachDetails]) => {
                            if (approachDetails && approachDetails.code) {
                                Object.entries(approachDetails.code).forEach(([lang, codeText]) => {
                                    const ext = extensionMap[lang.toLowerCase()] || `.${lang}`;
                                    const sanitizedApproach = sanitizePathName(approachName);
                                    const fileName = `${sanitizedApproach}${ext}`;
                                    const filePath = path.join(probPath, fileName);
                                    
                                    fs.writeFileSync(filePath, codeText, 'utf8');
                                    fileCount++;
                                });
                            }
                        });
                    }
                });
            });
        });

        res.json({ success: true, message: `Successfully exported ${fileCount} files into 'output/' folder` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Helper to get local IP addresses
function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    return addresses;
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running locally at http://localhost:${PORT}`);
    const localIps = getLocalIpAddresses();
    localIps.forEach(ip => {
        console.log(`Access on your Wi-Fi network at http://${ip}:${PORT}`);
    });
});
