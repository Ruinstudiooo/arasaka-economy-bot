/**
 * raw components v2 payloads. these are plain objects on purpose: the builders
 * move around between discord.js versions and the json below has not changed.
 *
 * types used here
 *   9  section        10 text display     11 thumbnail
 *   12 media gallery  14 separator        17 container
 */

export const Type = {
	section: 9,
	text: 10,
	thumbnail: 11,
	gallery: 12,
	separator: 14,
	container: 17,
}

/** chat input text, one block per line */
export function text(content) {
	return { type: Type.text, content: String(content ?? '') }
}

export function separator(divider = true, spacing = 1) {
	return { type: Type.separator, divider: Boolean(divider), spacing: spacing === 2 ? 2 : 1 }
}

export function thumbnail(url, description) {
	if (!url) return null
	return { type: Type.thumbnail, media: { url }, description: description ?? null }
}

/** text on the left, small image on the right */
export function section(content, image) {
	const node = { type: Type.section, components: Array.isArray(content) ? content : [text(content)] }
	const accessory = typeof image === 'string' ? thumbnail(image) : image
	if (accessory) node.accessory = accessory
	return node
}

export function gallery(urls) {
	const list = (Array.isArray(urls) ? urls : [urls])
		.filter(Boolean)
		.map(url => ({ media: { url }, description: null }))

	if (!list.length) return null
	return { type: Type.gallery, items: list }
}

/**
 * the whole message. accent color is the thin line down the left side, so this
 * is the one place a card gets its color from.
 */
export function container(children, options = {}) {
	const list = (Array.isArray(children) ? children : [children]).filter(Boolean)
	return {
		type: Type.container,
		accent_color: options.accent ?? null,
		spoiler: Boolean(options.spoiler),
		components: list,
	}
}

/** container + section + thumbnail, which is most of what a command needs */
export function card({ title, body, image, footer, accent, fields }) {
	const top = []

	if (title) top.push(`## ${title}`)
	if (body) top.push(String(body))

	const blocks = []
	if (top.length) blocks.push(section(top.join('\n'), image))

	if (fields?.length) {
		for (const field of fields) {
			if (field.name || field.value) blocks.push(text(`**${field.name ?? ''}**\n${field.value ?? ''}`))
		}
	}

	if (footer) {
		blocks.push(separator(true, 1))
		blocks.push(text(`-# ${footer}`))
	}

	return container(blocks, { accent })
}
