import { Events } from 'discord.js'
import { context, run } from '../handlers/execute.js'
import { log } from '../utils/logger.js'

/** slash commands, buttons and modals all land here */
export default {
	name: Events.InteractionCreate,
	async execute(interaction) {
		const { client } = interaction

		if (interaction.isChatInputCommand()) {
			const command = client.commands.get(interaction.commandName)
			if (!command) {
				log.warn(`no command for /${interaction.commandName}`)
				await interaction.reply({ content: 'that command is not loaded any more' }).catch(() => {})
				return
			}

			const args = interaction.options?.data?.length
				? interaction.options.data.map(option => option.value)
				: []

			const ctx = context({
				client,
				command,
				source: 'slash',
				args,
				raw: interaction.commandName,
				interaction,
			})

			await run(command, ctx)
			return
		}

		if (interaction.isAutocomplete()) {
			const command = client.commands.get(interaction.commandName)
			if (typeof command?.autocomplete === 'function') {
				try {
					await command.autocomplete(interaction)
				} catch (error) {
					console.error('[autocomplete] failed', error)
				}
			}
			return
		}

		if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
			const [name] = String(interaction.customId ?? '').split(':')
			const command = client.commands.get(name)
			const handler = command?.[handlerName(interaction)]

			if (typeof handler !== 'function') {
				log.warn(`nothing handles ${interaction.customId}`)
				return
			}

			try {
				await handler(
					interaction,
					context({
						client,
						command,
						source: 'component',
						interaction,
					}),
				)
			} catch (error) {
				console.error(`[component] ${interaction.customId} failed`, error)
			}
		}
	},
}

function handlerName(interaction) {
	if (interaction.isButton()) return 'button'
	if (interaction.isStringSelectMenu()) return 'select'
	return 'modal'
}
