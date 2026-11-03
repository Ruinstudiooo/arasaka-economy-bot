const stamp = () => new Date().toISOString().slice(11, 19)

/** one function so both `log('x')` and `log.warn('x')` work */
export const log = (...args) => console.log(`[${stamp()}]`, ...args)

log.info = log
log.warn = (...args) => console.warn(`[${stamp()}]`, ...args)
log.error = (...args) => console.error(`[${stamp()}]`, ...args)

export default log
