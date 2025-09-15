// Simple scheduler with two functions only
import { updateStatus } from './logger.js';

// Global state for active schedules
const activeSchedules = new Map();
let nextScheduleId = 1;
let statusUpdateInterval = null;

/**
 * Get detailed schedule information for status display
 */
export function getScheduleInfo() {
    const schedules = [];
    
    for (const [scheduleId, schedule] of activeSchedules) {
        const info = {
            id: scheduleId,
            type: schedule.type,
            startTime: schedule.startTime
        };
        
        if (schedule.type === 'interval') {
            // Calculate next execution time for interval
            const now = Date.now();
            const elapsed = now - schedule.startTime.getTime();
            const nextExecution = schedule.intervalMs - (elapsed % schedule.intervalMs);
            
            info.intervalMs = schedule.intervalMs;
            info.nextExecutionIn = Math.max(0, nextExecution);
            info.nextExecutionTime = new Date(now + info.nextExecutionIn);
            info.executeImmediately = schedule.executeImmediately;
            
            // Format time remaining
            const minutes = Math.floor(info.nextExecutionIn / 60000);
            const seconds = Math.floor((info.nextExecutionIn % 60000) / 1000);
            info.nextExecutionFormatted = `${minutes}m ${seconds}s`;
        } else if (schedule.type === 'times') {
            info.times = schedule.times;
            info.nextExecution = schedule.nextExecution;
            
            if (schedule.nextExecution) {
                const nextTime = new Date(schedule.nextExecution);
                info.nextExecutionTime = nextTime;
                info.nextExecutionFormatted = nextTime.toISOString().substr(11, 8) + ' UTC';
            }
        }
        
        schedules.push(info);
    }
    
    return schedules;
}

/**
 * Update status with current schedule information
 */
function updateScheduleStatus(shouldLog = false) {
    const schedules = getScheduleInfo();
    if (schedules.length === 0) return;
    
    const schedule = schedules[0]; // Assume single schedule for now
    const now = new Date();
    
    // Get the actual schedule object from activeSchedules to access lastExecution
    const actualSchedule = activeSchedules.get(schedule.id);
    
    let statusMessage = '';
    let details = {
        currentTime: now.toISOString(),
        scheduleType: schedule.type,
        scheduleId: schedule.id
    };
    
    if (schedule.type === 'interval') {
        statusMessage = `Next execution in: ${schedule.nextExecutionFormatted}`;
        details = {
            ...details,
            intervalMs: schedule.intervalMs,
            nextExecutionIn: schedule.nextExecutionIn,
            nextExecutionTime: schedule.nextExecutionTime.toISOString(),
            executeImmediately: schedule.executeImmediately
        };
    } else if (schedule.type === 'times') {
        statusMessage = `Next execution at: ${schedule.nextExecutionFormatted}`;
        details = {
            ...details,
            configuredTimes: schedule.times,
            nextExecutionTime: schedule.nextExecution ? new Date(schedule.nextExecution).toISOString() : null
        };
    }
    
    // Include last execution details if available from the actual schedule object
    if (actualSchedule && actualSchedule.lastExecution) {
        details.lastExecution = actualSchedule.lastExecution;
    }
    
    // Update status (this will always happen)
    updateStatus('waiting_next_execution', statusMessage, null, details, null, shouldLog);
}

/**
 * Start continuous status updates for schedules
 */
function startStatusUpdates() {
    if (statusUpdateInterval) return; // Already running
    
    let logCounter = 0;
    
    // Update status every 5 seconds
    statusUpdateInterval = setInterval(() => {
        if (activeSchedules.size > 0) {
            logCounter++;
            // Log every 12th update (12 * 5 seconds = 60 seconds = 1 minute)
            const shouldLog = logCounter >= 12;
            if (shouldLog) {
                logCounter = 0; // Reset counter
            }
            updateScheduleStatus(shouldLog);
        }
    }, 5000);
}

/**
 * Stop continuous status updates
 */
function stopStatusUpdates() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
    }
}

/**
 * Schedule execution at regular intervals
 * @param {Function} executeFunction - Function to execute
 * @param {number} intervalMs - Interval in milliseconds
 * @param {boolean} executeImmediately - Whether to execute once immediately when cycle starts
 * @returns {string} Schedule ID for stopping the schedule
 */
export function scheduleInterval(executeFunction, intervalMs, executeImmediately = false) {
    const scheduleId = `interval_${nextScheduleId++}`;
    
    console.log(`🕒 Starting interval schedule: every ${intervalMs}ms`);
    console.log(`📋 Schedule ID: ${scheduleId}`);
    console.log(`⚡ Execute immediately: ${executeImmediately}`);
    
    const wrappedFunction = async () => {
        try {
            console.log(`⏰ [${new Date().toISOString()}] Executing scheduled function...`);
            const executionStart = Date.now();
            const result = await executeFunction();
            const executionEnd = Date.now();
            
            // Store last execution details
            const schedule = activeSchedules.get(scheduleId);
            if (schedule) {
                schedule.lastExecution = {
                    timestamp: new Date().toISOString(),
                    duration: `${(executionEnd - executionStart) / 1000}s`,
                    success: result?.success || true,
                    details: result || {}
                };
            }
            
            console.log(`✅ Scheduled execution completed`);
        } catch (error) {
            console.error(`❌ Scheduled execution failed:`, error);
            
            // Store failed execution details
            const schedule = activeSchedules.get(scheduleId);
            if (schedule) {
                schedule.lastExecution = {
                    timestamp: new Date().toISOString(),
                    success: false,
                    error: error.message
                };
            }
        }
    };
    
    let intervalId;
    
    if (executeImmediately) {
        // Execute immediately first
        wrappedFunction();
    }
    
    // Set up interval
    intervalId = setInterval(wrappedFunction, intervalMs);
    
    // Store schedule info
    activeSchedules.set(scheduleId, {
        type: 'interval',
        intervalId,
        intervalMs,
        executeImmediately,
        startTime: new Date(),
        lastExecution: null
    });
    
    // Start status updates if this is the first schedule
    startStatusUpdates();
    
    return scheduleId;
}

/**
 * Schedule execution at specific times of day (UTC+0.0)
 * @param {Function} executeFunction - Function to execute
 * @param {Array} times - Array of time strings in "HH:MM" format (24-hour, UTC)
 * @returns {string} Schedule ID for stopping the schedule
 */
export function scheduleTimes(executeFunction, times) {
    const scheduleId = `times_${nextScheduleId++}`;
    
    console.log(`🕒 Starting time-based schedule: ${times.join(', ')} UTC`);
    console.log(`📋 Schedule ID: ${scheduleId}`);
    
    // Parse times to {hour, minute} objects
    const parsedTimes = times.map(timeStr => {
        const [hour, minute] = timeStr.split(':').map(Number);
        return { hour, minute };
    }).sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
    
    const wrappedFunction = async () => {
        try {
            console.log(`⏰ [${new Date().toISOString()}] Executing scheduled function...`);
            const executionStart = Date.now();
            const result = await executeFunction();
            const executionEnd = Date.now();
            
            // Store last execution details
            const schedule = activeSchedules.get(scheduleId);
            if (schedule) {
                schedule.lastExecution = {
                    timestamp: new Date().toISOString(),
                    duration: `${(executionEnd - executionStart) / 1000}s`,
                    success: result?.success || true,
                    details: result || {}
                };
            }
            
            console.log(`✅ Scheduled execution completed`);
        } catch (error) {
            console.error(`❌ Scheduled execution failed:`, error);
            
            // Store failed execution details
            const schedule = activeSchedules.get(scheduleId);
            if (schedule) {
                schedule.lastExecution = {
                    timestamp: new Date().toISOString(),
                    success: false,
                    error: error.message
                };
            }
        }
    };
    
    let timeoutId;
    
    const scheduleNext = () => {
        const now = new Date();
        const nowUtc = new Date(now.getTime() + now.getTimezoneOffset() * 60000); // Convert to UTC
        const todayUtc = new Date(nowUtc.getFullYear(), nowUtc.getMonth(), nowUtc.getDate());
        
        // Find next execution time
        let nextExecution = null;
        
        // Check times today
        for (const time of parsedTimes) {
            const executionTime = new Date(todayUtc.getTime() + time.hour * 3600000 + time.minute * 60000);
            if (executionTime > nowUtc) {
                nextExecution = executionTime;
                break;
            }
        }
        
        // If no time today, use first time tomorrow
        if (!nextExecution) {
            const tomorrowUtc = new Date(todayUtc.getTime() + 24 * 3600000);
            const firstTime = parsedTimes[0];
            nextExecution = new Date(tomorrowUtc.getTime() + firstTime.hour * 3600000 + firstTime.minute * 60000);
        }
        
        const delay = nextExecution.getTime() - nowUtc.getTime();
        console.log(`⏰ Next execution: ${nextExecution.toISOString()} (in ${Math.round(delay / 1000)}s)`);
            
            timeoutId = setTimeout(async () => {
            await wrappedFunction();
            scheduleNext(); // Schedule the next execution
            }, delay);
            
            // Update schedule info
        const schedule = activeSchedules.get(scheduleId);
            if (schedule) {
                schedule.timeoutId = timeoutId;
            schedule.nextExecution = nextExecution;
            }
        };
        
    // Store schedule info
    activeSchedules.set(scheduleId, {
            type: 'times',
        times: parsedTimes,
            startTime: new Date(),
        lastExecution: null
    });
    
    // Start scheduling
    scheduleNext();
    
    // Start status updates if this is the first schedule
    startStatusUpdates();
    
    return scheduleId;
}

/**
 * Stop a scheduled execution
 * @param {string} scheduleId - Schedule ID to stop
 * @returns {boolean} Success status
 */
export function stopSchedule(scheduleId) {
    const schedule = activeSchedules.get(scheduleId);
    
    if (!schedule) {
        console.log(`❌ Schedule ${scheduleId} not found`);
        return false;
    }
    
    if (schedule.intervalId) {
        clearInterval(schedule.intervalId);
    }
    
    if (schedule.timeoutId) {
        clearTimeout(schedule.timeoutId);
    }
    
    activeSchedules.delete(scheduleId);
    console.log(`🛑 Stopped schedule: ${scheduleId}`);
    
    // Stop status updates if no schedules remain
    if (activeSchedules.size === 0) {
        stopStatusUpdates();
    }
    
    return true;
}

/**
 * Stop all active schedules
 * @returns {number} Number of schedules stopped
 */
export function stopAllSchedules() {
    const scheduleIds = Array.from(activeSchedules.keys());
    let stoppedCount = 0;
    
    for (const scheduleId of scheduleIds) {
        if (stopSchedule(scheduleId)) {
            stoppedCount++;
        }
    }
    
    console.log(`🛑 Stopped ${stoppedCount} schedules`);
    
    // Stop status updates since all schedules are stopped
    stopStatusUpdates();
    
    return stoppedCount;
}

/**
 * Get list of active schedules
 * @returns {Array} Array of schedule info
 */
export function getActiveSchedules() {
    const schedules = [];
    
    for (const [scheduleId, schedule] of activeSchedules) {
        schedules.push({
            id: scheduleId,
            type: schedule.type,
            startTime: schedule.startTime,
            ...(schedule.intervalMs && { intervalMs: schedule.intervalMs }),
            ...(schedule.times && { times: schedule.times }),
            ...(schedule.nextExecution && { nextExecution: schedule.nextExecution })
        });
    }
    
    return schedules;
}

