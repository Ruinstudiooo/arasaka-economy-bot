/**
 * per user per command cooldown, in memory. a restart clears it, which is what
 * you want for a bot that also stores the real daily timers in the ledger.
 */
const buckets = new Map()

export function remaining(key, ms) {
	if (!ms) return 0

	const until = buckets.get(key)
	if (!until) return 0

	const left = until - Date.now()
	if (left <= 0) {
		buckets.delete(key)
		return 0
	}

	return left
}

export function start(key, ms) {
	if (!ms) return
	buckets.set(key, Date.now() + ms)
}

export function clear(key) {
	buckets.delete(key)
}

export function sweep() {
	const now = Date.now()
	for (const [key, until] of buckets) {
		if (until <= now) buckets.delete(key)
	}
}
