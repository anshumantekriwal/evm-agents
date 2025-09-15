// Simple and efficient logger
let logs = [];
let currentStatus = {
    stage: 'idle',
    message: 'System ready',
    timestamp: new Date().toISOString(),
    success: null,
    details: {},
    schedule: null // Will contain schedule information
};

const MAX_LOGS = 1000; // Keep last 1000 logs

/**
 * Simple logger class
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
            id: Date.now() + Math.random()
        };

        // Log to console
        console.log(message);

        // Store for endpoint
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

/**
 * Status management functions
 */
function updateStatus(stage, message, success = null, details = {}, shouldLog = true) {
    currentStatus = {
        stage,
        message,
        timestamp: new Date().toISOString(),
        success,
        details,
        schedule: null // Keep for backward compatibility
    };
    
    // Only log if shouldLog is true (for smart logging)
    if (shouldLog) {
        const statusMessage = `[${stage.toUpperCase()}] ${message}`;
        if (success === false) {
            logger.error(statusMessage);
        } else if (success === true) {
            logger.info(`✅ ${statusMessage}`);
        } else {
            logger.info(statusMessage);
        }
    }
}

function getStatus() {
    return currentStatus;
}

function resetStatus() {
    currentStatus = {
        stage: 'idle',
        message: 'System ready',
        timestamp: new Date().toISOString(),
        success: null,
        details: {},
        schedule: null
    };
}

/**
 * Update schedule information in current status
 */
function updateScheduleStatus(scheduleInfo) {
    if (currentStatus) {
        currentStatus.schedule = scheduleInfo;
    }
}

// Create singleton logger instance
const logger = new Logger();

export { logger, updateStatus, getStatus, resetStatus, updateScheduleStatus };