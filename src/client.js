import { Client, GatewayIntentBits } from 'discord.js'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { loadCommands } from './handlers/commands.js'
import { loadEvents } from './handlers/events.js'
import { aradata } from './services/aradata.js'
import { log } from './utils/logger.js'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * builds the client and fills it up. logging in is left to the caller so a
 * script can use this without a connection.
 */
export async function createClient() {
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.DirectMessages,
		],
	})

	client.commands = await loadCommands(join(here, 'commands'))
	client.aradata = aradata

	const events = await loadEvents(client, join(here, 'events'))

	log(`loaded ${client.commands.all().length} commands and ${events} events`)

	return client
}

export default createClient
