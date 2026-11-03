import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * walks src/commands and imports every .js file it finds, so nested folders
 * work too. a command file exports `default`, either a Command instance or a
 * plain object that looks like one.
 */
export async function loadCommands(root) {
	const commands = new Map()
	const aliases = new Map()
	const files = []

	walk(root, files)

	for (const file of files) {
		try {
			const module = await import(pathToFileURL(file).href)
			const command = module.default ?? module.command

			if (!command) {
				console.warn(`[commands] ${file} has no default export, skipped`)
				continue
			}

			const name = String(command.name ?? '').toLowerCase()
			if (!name) {
				console.warn(`[commands] ${file} has no name, skipped`)
				continue
			}

			if (commands.has(name)) {
				console.warn(`[commands] ${name} is already taken by another file, skipped`)
				continue
			}

			commands.set(name, command)

			for (const alias of command.aliases ?? []) {
				const key = String(alias).toLowerCase()
				if (aliases.has(key) || commands.has(key)) {
					console.warn(`[commands] alias ${key} is already taken, skipped`)
					continue
				}
				aliases.set(key, name)
			}

			if (typeof command.execute !== 'function') {
				console.warn(`[commands] ${name} has no execute function, it will fail when used`)
			}
		} catch (error) {
			console.error(`[commands] could not load ${file}`, error)
		}
	}

	return {
		commands,
		aliases,
		get(name) {
			const key = String(name ?? '').toLowerCase()
			return commands.get(key) ?? commands.get(aliases.get(key))
		},
		all() {
			return [...commands.values()]
		},
		slash() {
			return this.all()
				.map(command => command.slash)
				.filter(Boolean)
		},
	}
}

function walk(dir, out) {
	let entries

	try {
		entries = readdirSync(dir)
	} catch {
		return out
	}

	for (const entry of entries) {
		const full = join(dir, entry)
		const stat = statSync(full)

		if (stat.isDirectory()) walk(full, out)
		else if (entry.endsWith('.js')) out.push(full)
	}

	return out
}
