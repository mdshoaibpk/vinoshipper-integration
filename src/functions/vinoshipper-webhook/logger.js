/**
 * Logger utility for Vinoshipper webhook function
 * Provides consistent logging across the application
 */

const logLevel = process.env.LOG_LEVEL || 'info';

const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

function shouldLog(level) {
    return logLevels[level] <= logLevels[logLevel];
}

function formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        function: 'vinoshipper-webhook',
        ...data
    };

    return JSON.stringify(logEntry);
}

function log(level, message, data = {}) {
    if (shouldLog(level)) {
        console.log(formatMessage(level, message, data));
    }
}

module.exports = {
    error: (message, data = {}) => log('error', message, data),
    warn: (message, data = {}) => log('warn', message, data),
    info: (message, data = {}) => log('info', message, data),
    debug: (message, data = {}) => log('debug', message, data)
}; 