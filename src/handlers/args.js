/**
 * splits a prefix command line. handles quoted strings so
 * `!pay "big guy" 500` gives the name as one arg, and keeps the raw tail
 * around for anything that wants the rest of the line untouched.
 */
export function parseArgs(input) {
	const text = String(input ?? '').trim()
	if (!text) return { args: [], raw: '' }

	const args = []
	let current = ''
	let quote = null
	let started = false

	for (let i = 0; i < text.length; i++) {
		const char = text[i]

		if (quote) {
			if (char === quote) {
				quote = null
				args.push(current)
				current = ''
				started = false
			} else {
				current += char
			}
			continue
		}

		if (char === '"' || char === "'") {
			quote = char
			started = true
			continue
		}

		if (/\s/.test(char)) {
			if (started) {
				args.push(current)
				current = ''
				started = false
			}
			continue
		}

		current += char
		started = true
	}

	if (started) args.push(current)

	return { args, raw: text }
}

/** strips the prefix off a message, returns undefined when there is none */
export function stripPrefix(content, prefixes) {
	const text = String(content ?? '')

	for (const prefix of prefixes) {
		if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
			return text.slice(prefix.length)
		}
	}

	return undefined
}

/** mentions, ids and plain numbers all become a number */
export function toNumber(value) {
	if (typeof value === 'number') return Number.isFinite(value) ? value : undefined

	const clean = String(value ?? '')
		.replace(/[<@!>]/g, '')
		.replace(/[, _]/g, '')
		.trim()

	if (!/^-?\d+(\.\d+)?$/.test(clean)) return undefined

	const number = Number(clean)
	if (!Number.isFinite(number)) return undefined

	// a discord id that big loses digits in a double, better to say no than to
	// hand a command the wrong person
	if (Math.abs(number) > Number.MAX_SAFE_INTEGER) return undefined

	return number
}

/** first mention or raw id in the args, whatever it looks like */
export function toUserId(value) {
	const match = /<@!?(\d{15,25})>/.exec(String(value ?? ''))
	if (match) return match[1]

	const clean = String(value ?? '').replace(/[<@!>]/g, '').trim()
	return /^\d{15,25}$/.test(clean) ? clean : undefined
}
