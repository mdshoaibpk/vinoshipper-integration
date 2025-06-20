const logger = {
    info: (message, data) => {
        const logEntry = data !== undefined ? { message, data } : message;
        console.log(JSON.stringify(logEntry));
    },

    error: (message, error) => {
        const logEntry = error !== undefined ? { message, error } : message;
        console.error(JSON.stringify(logEntry));
    },

    debug: (message, data) => {
        const logEntry = data !== undefined ? { message, data } : message;
        console.debug(JSON.stringify(logEntry));
    },

    warn: (message, data) => {
        const logEntry = data !== undefined ? { message, data } : message;
        console.warn(JSON.stringify(logEntry));
    }
};

module.exports = logger; 