/**
 * every command is a plain object so a new file is all it takes to add one.
 * this just checks the shape early instead of letting a typo crash a slash
 * command at 3am.
 */
export class Command {
	constructor(options) {
		const { name, aliases, category, description, cooldown, slash, prefix, permissions, execute } = options

		if (!name || typeof name !== 'string') throw new Error('a command needs a name')
		if (typeof execute !== 'function') throw new Error(`${name} needs an execute function`)

		this.name = name.toLowerCase()
		this.aliases = (aliases ?? []).map(alias => String(alias).toLowerCase())
		this.category = category ?? 'general'
		this.description = description ?? ''
		this.cooldown = cooldown ?? 0
		this.slash = slash ?? null
		this.prefix = prefix ?? null
		this.permissions = permissions ?? null
		this.execute = execute
	}

	/** everything the prefix parser needs to know */
	get usage() {
		return this.prefix ?? this.name
	}

	/** true when this file also registered a slash command */
	get hasSlash() {
		return Boolean(this.slash)
	}
}

export default Command
