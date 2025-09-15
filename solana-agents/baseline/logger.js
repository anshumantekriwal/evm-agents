import express from 'express';

// Store logs in memory (in production, you might want to use a database or file)
let logs = [];
const MAX_LOGS = 1000; // Keep last 1000 logs

/**
 * Custom logger that logs to both console and stores for server endpoint
 */
class Logger {
    constructor() {
        this.logs = logs;
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            id: Date.now() + Math.random() // Simple unique ID
        };

        // Log to console (original behavior)
        console.log(message);

        // Store for server endpoint
        this.logs.push(logEntry);

        // Keep only the last MAX_LOGS entries
        if (this.logs.length > MAX_LOGS) {
            this.logs.shift();
        }
    }

    error(message) {
        this.log(message, 'error');
    }

    warn(message) {
        this.log(message, 'warn');
    }

    info(message) {
        this.log(message, 'info');
    }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs.length = 0;
    }
}

// Create singleton logger instance
const logger = new Logger();

/**
 * Create and start the Express server
 */
function createLogServer(port = 3000, withdrawFunctions = null) {
    const app = express();
    
    // Add JSON parsing middleware
    app.use(express.json());

    // Serve logs as JSON at root endpoint
    app.get('/', (req, res) => {
        res.json({
            status: 'success',
            totalLogs: logger.getLogs().length,
            logs: logger.getLogs(),
            lastUpdated: new Date().toISOString()
        });
    });

    // Serve logs as HTML for browser viewing
    app.get('/html', (req, res) => {
        const logs = logger.getLogs();
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Solana Agent Logs</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: 'Courier New', monospace; 
            background: #1a1a1a; 
            color: #00ff00; 
            margin: 0; 
            padding: 20px; 
        }
        .header { 
            background: #333; 
            padding: 15px; 
            margin-bottom: 20px; 
            border-radius: 5px; 
        }
        .log-entry { 
            margin: 5px 0; 
            padding: 8px; 
            border-left: 3px solid #00ff00; 
            background: #2a2a2a; 
        }
        .log-entry.error { border-left-color: #ff4444; color: #ff8888; }
        .log-entry.warn { border-left-color: #ffaa00; color: #ffcc66; }
        .timestamp { 
            color: #888; 
            font-size: 0.8em; 
        }
        .refresh-btn {
            background: #00ff00;
            color: #000;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            border-radius: 3px;
            margin-bottom: 20px;
        }
        .refresh-btn:hover { background: #00cc00; }
    </style>
    <script>
        function refreshLogs() {
            location.reload();
        }
        // Auto-refresh every 5 seconds
        setInterval(refreshLogs, 5000);
    </script>
</head>
<body>
    <div class="header">
        <h1>🤖 Solana Trading Agent Logs</h1>
        <p>Total logs: ${logs.length} | Last updated: ${new Date().toLocaleString()}</p>
        <button class="refresh-btn" onclick="refreshLogs()">🔄 Refresh Now</button>
    </div>
    <div class="logs">
        ${logs.map(log => `
            <div class="log-entry ${log.level}">
                <span class="timestamp">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
                ${log.message}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
        res.send(html);
    });

    // Clear logs endpoint
    app.post('/clear', (req, res) => {
        logger.clearLogs();
        res.json({ status: 'success', message: 'Logs cleared' });
    });

    // Withdraw funds endpoint
    app.post('/withdraw', async (req, res) => {
        try {
            // Check if withdraw functions are available
            if (!withdrawFunctions || !withdrawFunctions.withdrawFunds || !withdrawFunctions.ownerAddress) {
                return res.status(503).json({
                    success: false,
                    error: 'Withdraw functionality not available'
                });
            }

            const { tokenSymbol, destinationAddress, amount, withdrawAll = false } = req.body;

            // Validate required parameters
            if (!tokenSymbol || !destinationAddress) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters: tokenSymbol and destinationAddress'
                });
            }

            // Validate amount for non-withdrawAll requests
            if (!withdrawAll && (amount === undefined || amount === null || amount <= 0)) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount must be a positive number when withdrawAll is false'
                });
            }

            // Validate destination address format
            if (typeof destinationAddress !== 'string' || destinationAddress.length < 32) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid destination address format'
                });
            }

            logger.log(`🌐 API Withdraw request: ${withdrawAll ? 'ALL' : amount} ${tokenSymbol} → ${destinationAddress.slice(0, 8)}...${destinationAddress.slice(-8)}`);

            // Execute withdrawal
            let result;
            if (withdrawAll) {
                result = await withdrawFunctions.withdrawAllFunds(
                    withdrawFunctions.ownerAddress,
                    tokenSymbol,
                    destinationAddress
                );
            } else {
                result = await withdrawFunctions.withdrawFunds(
                    withdrawFunctions.ownerAddress,
                    tokenSymbol,
                    destinationAddress,
                    amount
                );
            }

            // Log the result
            if (result.success) {
                logger.log(`✅ API Withdraw completed: ${result.signature}`);
            } else {
                logger.error(`❌ API Withdraw failed: ${result.error}`);
            }

            // Return result
            res.json(result);

        } catch (error) {
            const errorMsg = `API Withdraw error: ${error.message}`;
            logger.error(`❌ ${errorMsg}`);
            res.status(500).json({
                success: false,
                error: errorMsg
            });
        }
    });

    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'healthy', uptime: process.uptime() });
    });

    const server = app.listen(port, () => {
        console.log(`📡 Log server running at http://localhost:${port}`);
        console.log(`📊 View logs: http://localhost:${port}/html`);
        console.log(`🔧 API endpoint: http://localhost:${port}/`);
        if (withdrawFunctions) {
            console.log(`💸 Withdraw endpoint: POST http://localhost:${port}/withdraw`);
        }
    });

    return server;
}

export { logger, createLogServer };
