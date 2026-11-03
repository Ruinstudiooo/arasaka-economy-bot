import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** every file in src/events becomes a listener, once: true is respected */
export async function loadEvents(client, root) {
	let files = []

	try {
		files = readdirSync(root).filter(file => file.endsWith('.js'))
	} catch (error) {
		console.error('[events] could not read the events folder', error)
		return 0
	}

	let count = 0

	for (const file of files) {
		const full = join(root, file)

		try {
			const module = await import(pathToFileURL(full).href)
			const event = module.default ?? module.event

			if (!event?.name || typeof event.execute !== 'function') {
				console.warn(`[events] ${file} is missing name or execute, skipped`)
				continue
			}

			if (event.once) client.once(event.name, (...args) => event.execute(...args))
			else client.on(event.name, (...args) => event.execute(...args))

			count++
		} catch (error) {
			console.error(`[events] could not load ${file}`, error)
		}
	}

	return count
}
