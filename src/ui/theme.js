import { config } from '../config.js'

/**
 * arasaka red on near black. keep text short, a card is not a novel.
 */
export const theme = {
	accent: config.colors.accent,
	dark: config.colors.dark,
	good: config.colors.good,
	bad: config.colors.bad,
	warn: config.colors.warn,
}

export function money(amount) {
	const value = Number(amount) || 0
	return `€$${value.toLocaleString('en-US')}`
}

/** "2h 14m" style, for anything counting down */
export function duration(ms) {
	const total = Math.max(0, Math.floor(ms / 1000))
	const days = Math.floor(total / 86400)
	const hours = Math.floor((total % 86400) / 3600)
	const minutes = Math.floor((total % 3600) / 60)
	const seconds = total % 60

	const parts = []
	if (days) parts.push(`${days}d`)
	if (hours) parts.push(`${hours}h`)
	if (minutes) parts.push(`${minutes}m`)
	if (!days && !hours) parts.push(`${seconds}s`)

	return parts.slice(0, 2).join(' ')
}

/** discord shows this as a live countdown in the reader's own timezone */
export function timestamp(ms, style = 'R') {
	return `<t:${Math.floor(ms / 1000)}:${style}>`
}

export function truncate(value, max = 1024) {
	const text = String(value ?? '')
	return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
