import { REST, Routes } from 'discord.js'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { loadCommands } from './handlers/commands.js'
import { config, requireToken } from './config.js'

requireToken()

if (!config.clientId) {
	console.error('no CLIENT_ID set, cannot register commands')
	process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const registry = await loadCommands(join(here, 'commands'))
const body = registry.slash().map(command => command.toJSON ? command.toJSON() : command)

const rest = new REST().setToken(config.token)

const route = config.guildId
	? Routes.applicationGuildCommands(config.clientId, config.guildId)
	: Routes.applicationCommands(config.clientId)

try {
	const data = await rest.put(route, { body })
	console.log(`registered ${data.length} commands${config.guildId ? ` in ${config.guildId}` : ' globally'}`)
} catch (error) {
	console.error('registration failed', error?.message ?? error)
	process.exit(1)
}
