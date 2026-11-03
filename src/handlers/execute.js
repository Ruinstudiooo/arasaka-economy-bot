import * as cooldowns from './cooldowns.js'
import { note, reply } from '../ui/reply.js'
import { duration, theme } from '../ui/theme.js'

/**
 * one path for prefix and slash so a command never has to care which one it
 * came from. handles permissions, cooldowns and the error card in one place.
 */
export async function run(command, ctx) {
	const { user, member } = ctx

	const denied = missingPermissions(command, member)
	if (denied) {
		await reply(ctx, note(`you need **${denied}** for \`${command.name}\`.`, { accent: theme.bad }), {
			ephemeral: true,
		})
		return
	}

	if (command.cooldown > 0) {
		const key = `${command.name}:${user.id}`
		const left = cooldowns.remaining(key, command.cooldown)

		if (left > 0) {
			await reply(ctx, note(`slow down, \`${command.name}\` is ready in **${duration(left)}**.`, { accent: theme.warn }), {
				ephemeral: true,
			})
			return
		}

		cooldowns.start(key, command.cooldown)
	}

	try {
		await command.execute(ctx)
	} catch (error) {
		console.error(`[command] ${command.name} failed`, error)

		const message = String(error?.message ?? error)
		try {
			await reply(ctx, note(`\`${command.name}\` broke: ${message.slice(0, 300)}`, { accent: theme.bad }), {
				ephemeral: true,
			})
		} catch {
			// the channel is gone or the interaction expired, the log has it
		}
	}
}

function missingPermissions(command, member) {
	const needed = command.permissions
	if (!needed) return null

	const list = Array.isArray(needed) ? needed : [needed]
	const missing = list.filter(permission => !member?.permissions?.has?.(permission))

	return missing.length ? missing.join(', ') : null
}

/** builds what a command gets, same shape from both entry points */
export function context({ client, command, source, args = [], raw = '', message, interaction, extra = {} }) {
	const user = interaction?.user ?? message?.author
	const member = interaction?.member ?? message?.member

	const ctx = {
		client,
		command,
		source,
		args,
		raw,
		message,
		interaction,
		user,
		member,
		guild: interaction?.guild ?? message?.guild ?? null,
		channel: interaction?.channel ?? message?.channel ?? null,
		...extra,
		reply: (view, options) => reply(ctx, view, options),
	}

	return ctx
}
