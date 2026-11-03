import { Events } from 'discord.js'
import { parseArgs, stripPrefix } from '../handlers/args.js'
import { context, run } from '../handlers/execute.js'
import { config } from '../config.js'

/** prefix commands, quiet about near misses so channels do not fill up */
export default {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.author?.bot) return
		if (!message.content) return

		const body = stripPrefix(message.content, config.prefixes)
		if (body === undefined) return

		const [name, ...rest] = body.trim().split(/\s+/)
		if (!name) return

		const command = message.client.commands.get(name)
		if (!command) return

		const { args, raw } = parseArgs(rest.join(' '))

		const ctx = context({
			client: message.client,
			command,
			source: 'prefix',
			args,
			raw,
			message,
		})

		await run(command, ctx)
	},
}
