// =============================
// ======= Scheduling System =======
// =============================

// Global scheduler state
const schedulerState = {
    activeSchedules: new Map(),
    nextScheduleId: 1
};

/**
 * Parse scheduling configuration from user input
 * @param {string} scheduleType - 'interval' or 'times'
 * @param {string} scheduleValue - The schedule specification
 * @returns {Object} Parsed schedule configuration
 */
export function parseScheduleConfig(scheduleType, scheduleValue) {
    const config = { type: scheduleType, isValid: false };
    
    try {
        if (scheduleType === 'interval') {
            // Parse interval format: "5m", "1h", "30s", "2h30m"
            const intervalRegex = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i;
            const match = scheduleValue.toLowerCase().match(intervalRegex);
            
            if (match) {
                const hours = parseInt(match[1]) || 0;
                const minutes = parseInt(match[2]) || 0;
                const seconds = parseInt(match[3]) || 0;
                
                const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
                
                if (totalMs > 0) {
                    config.intervalMs = totalMs;
                    config.isValid = true;
                    config.description = `Every ${scheduleValue}`;
                }
            }
        } else if (scheduleType === 'times') {
            // Parse time format: "09:30", "14:00,18:30", "9:30 AM,2:30 PM"
            const times = scheduleValue.split(',').map(t => t.trim());
            const parsedTimes = [];
            
            for (const timeStr of times) {
                const time = parseTimeString(timeStr);
                if (time !== null) {
                    parsedTimes.push(time);
                }
            }
            
            if (parsedTimes.length > 0) {
                config.times = parsedTimes.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
                config.isValid = true;
                config.description = `At ${parsedTimes.map(t => `${t.hour.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')}`).join(', ')}`;
            }
        }
    } catch (error) {
        console.error('Error parsing schedule config:', error);
    }
    
    return config;
}

/**
 * Parse time string to hour/minute object
 * @param {string} timeStr - Time string like "09:30", "9:30 AM", "14:00"
 * @returns {Object|null} {hour, minute} or null if invalid
 */
function parseTimeString(timeStr) {
    try {
        // Handle AM/PM format
        const ampmRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
        const ampmMatch = timeStr.match(ampmRegex);
        
        if (ampmMatch) {
            let hour = parseInt(ampmMatch[1]);
            const minute = parseInt(ampmMatch[2]);
            const period = ampmMatch[3].toUpperCase();
            
            if (period === 'PM' && hour !== 12) hour += 12;
            if (period === 'AM' && hour === 12) hour = 0;
            
            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                return { hour, minute };
            }
        }
        
        // Handle 24-hour format
        const timeRegex = /^(\d{1,2}):(\d{2})$/;
        const timeMatch = timeStr.match(timeRegex);
        
        if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2]);
            
            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                return { hour, minute };
            }
        }
    } catch (error) {
        console.error('Error parsing time string:', error);
    }
    
    return null;
}

/**
 * Calculate next execution time for time-based schedule
 * @param {Array} times - Array of {hour, minute} objects
 * @returns {Date} Next execution date
 */
function getNextExecutionTime(times) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Find next time today
    for (const time of times) {
        const executionTime = new Date(today.getTime() + time.hour * 3600000 + time.minute * 60000);
        if (executionTime > now) {
            return executionTime;
        }
    }
    
    // If no time today, use first time tomorrow
    const tomorrow = new Date(today.getTime() + 24 * 3600000);
    const firstTime = times[0];
    return new Date(tomorrow.getTime() + firstTime.hour * 3600000 + firstTime.minute * 60000);
}

/**
 * Start scheduled execution of baseline function
 * @param {Object} params - Baseline function parameters
 * @param {Object} scheduleConfig - Schedule configuration
 * @param {Function} executeFunction - Function to execute on schedule
 * @returns {string} Schedule ID for management
 */
export function startScheduledExecution(params, scheduleConfig, executeFunction) {
    const scheduleId = `schedule_${schedulerState.nextScheduleId++}`;
    
    console.log(`🕒 Starting scheduled execution: ${scheduleConfig.description}`);
    console.log(`📋 Schedule ID: ${scheduleId}`);
    
    let timeoutId;
    let intervalId;
    
    const wrappedExecuteFunction = async () => {
        try {
            console.log(`\n⏰ [${new Date().toISOString()}] Executing scheduled baseline function...`);
            const result = await executeFunction(params.ownerAddress, params.fromToken, params.toToken, params.amount);
            if (result && result.success) {
                console.log(`✅ Scheduled execution completed at ${new Date().toISOString()}\n`);
            } else if (result && result.error) {
                console.log(`⚠️ Scheduled execution completed with issues: ${result.error}`);
            } else {
                console.log(`✅ Scheduled execution completed at ${new Date().toISOString()}\n`);
            }
        } catch (error) {
            console.error(`❌ Scheduled execution failed at ${new Date().toISOString()}:`, error);
        }
    };
    
    if (scheduleConfig.type === 'interval') {
        // Interval-based scheduling
        console.log(`⏱️  Will execute every ${scheduleConfig.intervalMs}ms`);
        
        // Execute immediately, then set interval
        wrappedExecuteFunction();
        intervalId = setInterval(wrappedExecuteFunction, scheduleConfig.intervalMs);
        
        schedulerState.activeSchedules.set(scheduleId, {
            type: 'interval',
            intervalId,
            config: scheduleConfig,
            params,
            startTime: new Date(),
            executionCount: 1
        });
        
    } else if (scheduleConfig.type === 'times') {
        // Time-based scheduling
        const scheduleNextExecution = () => {
            const nextTime = getNextExecutionTime(scheduleConfig.times);
            const delay = nextTime.getTime() - Date.now();
            
            console.log(`⏰ Next execution scheduled for: ${nextTime.toISOString()}`);
            console.log(`⏳ Time until next execution: ${Math.round(delay / 1000)}s`);
            
            timeoutId = setTimeout(async () => {
                await wrappedExecuteFunction();
                
                // Update execution count
                const schedule = schedulerState.activeSchedules.get(scheduleId);
                if (schedule) {
                    schedule.executionCount++;
                    schedule.lastExecution = new Date();
                }
                
                // Schedule next execution
                scheduleNextExecution();
            }, delay);
            
            // Update schedule info
            const schedule = schedulerState.activeSchedules.get(scheduleId);
            if (schedule) {
                schedule.timeoutId = timeoutId;
                schedule.nextExecution = nextTime;
            }
        };
        
        schedulerState.activeSchedules.set(scheduleId, {
            type: 'times',
            config: scheduleConfig,
            params,
            startTime: new Date(),
            executionCount: 0
        });
        
        scheduleNextExecution();
    }
    
    return scheduleId;
}

/**
 * Stop a scheduled execution
 * @param {string} scheduleId - Schedule ID to stop
 * @returns {boolean} Success status
 */
export function stopScheduledExecution(scheduleId) {
    const schedule = schedulerState.activeSchedules.get(scheduleId);
    
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
    
    schedulerState.activeSchedules.delete(scheduleId);
    console.log(`🛑 Stopped scheduled execution: ${scheduleId}`);
    
    return true;
}

/**
 * Get status of all active schedules
 * @returns {Array} Array of schedule status objects
 */
export function getScheduleStatus() {
    const statuses = [];
    
    for (const [scheduleId, schedule] of schedulerState.activeSchedules) {
        const status = {
            id: scheduleId,
            type: schedule.type,
            description: schedule.config.description,
            startTime: schedule.startTime,
            executionCount: schedule.executionCount,
            params: schedule.params
        };
        
        if (schedule.nextExecution) {
            status.nextExecution = schedule.nextExecution;
        }
        
        if (schedule.lastExecution) {
            status.lastExecution = schedule.lastExecution;
        }
        
        statuses.push(status);
    }
    
    return statuses;
}

/**
 * Stop all active schedules
 */
export function stopAllSchedules() {
    const activeScheduleIds = Array.from(schedulerState.activeSchedules.keys());
    let stoppedCount = 0;
    
    for (const scheduleId of activeScheduleIds) {
        if (stopScheduledExecution(scheduleId)) {
            stoppedCount++;
        }
    }
    
    console.log(`🛑 Stopped ${stoppedCount} active schedules`);
    return stoppedCount;
}

/**
 * Display current schedule status in a formatted way
 */
export function displayScheduleStatus() {
    const statuses = getScheduleStatus();
    
    if (statuses.length === 0) {
        console.log('📋 No active schedules');
        return;
    }
    
    console.log('\n📋 Active Schedules:');
    console.log('==================');
    
    for (const status of statuses) {
        console.log(`\n🔹 ${status.id}`);
        console.log(`   Type: ${status.type}`);
        console.log(`   Description: ${status.description}`);
        console.log(`   Started: ${status.startTime.toISOString()}`);
        console.log(`   Executions: ${status.executionCount}`);
        console.log(`   Trading: ${status.params.amount} ${status.params.fromToken} → ${status.params.toToken}`);
        
        if (status.nextExecution) {
            console.log(`   Next: ${status.nextExecution.toISOString()}`);
        }
        
        if (status.lastExecution) {
            console.log(`   Last: ${status.lastExecution.toISOString()}`);
        }
    }
    console.log('');
}

/**
 * Interactive function to get scheduling preferences from user
 * This would typically be called from a CLI or web interface
 */
export function getSchedulingInput() {
    console.log('\n📅 Scheduling Options:');
    console.log('1. interval - Execute at regular intervals');
    console.log('2. times - Execute at specific times of day');
    console.log('3. immediate - Execute once now (no scheduling)');
    
    console.log('\n📝 Format Examples:');
    console.log('Interval formats: "30m", "1h", "2h30m", "45s"');
    console.log('Time formats: "09:30", "14:00,18:30", "9:30 AM,2:30 PM"');
    
    // In a real implementation, you would use readline or a web form
    // For now, this serves as documentation
    return {
        type: 'interval', // or 'times' or 'immediate'
        value: '30m' // or time string like "09:30,15:30"
    };
}
