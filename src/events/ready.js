import { Events } from 'discord.js'
import { log } from '../utils/logger.js'

export default {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		log(`logged in as ${client.user.tag}`)
		log(`${client.commands.all().length} commands loaded, ${client.commands.slash().length} with a slash entry`)
		log(`aradata source: ${client.aradata.source}`)

		client.user.setPresence({
			activities: [{ name: 'night city', type: 3 }],
			status: 'online',
		})
	},
}
