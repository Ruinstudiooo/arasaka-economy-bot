import { createClient } from './client.js'
import { config, requireToken } from './config.js'
import { log } from './utils/logger.js'

requireToken()

const client = await createClient()

// a single bad interaction should never take the process down
process.on('unhandledRejection', error => log.error('unhandled rejection', error))
process.on('uncaughtException', error => log.error('uncaught exception', error))

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		log(`${signal}, shutting down`)
		client.destroy()
		process.exit(0)
	})
}

try {
	await client.login(config.token)
} catch (error) {
	log.error('login failed, is the token right?', error?.message ?? error)
	process.exit(1)
}
