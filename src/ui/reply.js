import { MessageFlags } from 'discord.js'
import { container, text } from './components.js'

/**
 * components v2 has its own flag and refuses content, embeds and stickers.
 * 1 << 15 is IsComponentsV2, kept as a literal so an older discord.js still
 * sends the right number.
 */
export const V2 = MessageFlags?.IsComponentsV2 ?? 1 << 15
export const Ephemeral = MessageFlags?.Ephemeral ?? 1 << 6

function payload(view, { ephemeral = false } = {}) {
	const components = (Array.isArray(view) ? view : [view]).filter(Boolean)
	return {
		components,
		flags: V2 | (ephemeral ? Ephemeral : 0),
		allowedMentions: { parse: [] },
	}
}

/** a one liner inside the standard card, for errors and small answers */
export function note(body, options = {}) {
	return container([text(String(body))], { accent: options.accent })
}

/**
 * sends through whatever the caller is: a slash command, a button, or a plain
 * message. already acknowledged interactions get edited instead of a second
 * reply, which would fail.
 */
export async function reply(target, view, options = {}) {
	const body = payload(view, options)

	const interaction = target?.isRepliable?.() ? target : target?.interaction
	if (interaction) {
		if (interaction.deferred || interaction.replied) {
			return interaction.editReply({ components: body.components, allowedMentions: body.allowedMentions })
		}
		return interaction.reply(body)
	}

	const message = target?.message ?? target
	if (message?.reply) return message.reply(body)
	if (message?.channel?.send) return message.channel.send(body)

	throw new Error('nothing to reply to')
}

/** for a follow up after the first reply is used up */
export async function followUp(target, view, options = {}) {
	const body = payload(view, options)
	const interaction = target?.isRepliable?.() ? target : target?.interaction

	if (interaction) return interaction.followUp(body)

	const message = target?.message ?? target
	if (message?.reply) return message.reply(body)
	if (message?.channel?.send) return message.channel.send(body)

	throw new Error('nothing to follow up on')
}

export default { reply, followUp, note, V2, Ephemeral }
