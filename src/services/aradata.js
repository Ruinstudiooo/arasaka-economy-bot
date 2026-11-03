import { GitHubFile } from './github.js'
import { config } from '../config.js'

/**
 * the economy data lives in the aradata repo, not in the bot. the bot reads it,
 * keeps a short cache, and writes it back one commit at a time.
 *
 * there is one ledger for the whole bot. balances are keyed by user id and
 * nothing here knows what a guild is, which is the point: a player carries the
 * same wallet into every server, the way owo does it.
 */
export class Aradata extends GitHubFile {
	constructor(options = {}) {
		super({
			repo: config.aradata.repo,
			branch: config.aradata.branch,
			path: config.aradata.path,
			token: config.aradata.token,
			ttl: config.aradata.ttl,
			...options,
		})

		this.queue = Promise.resolve()
	}

	/** the whole file, with the users map guaranteed to be a map */
	async economy(options) {
		const data = await this.read(options)
		return normalize(data)
	}

	async top(limit = 10, options) {
		const economy = await this.economy(options)
		return rank(economy.users).slice(0, Math.max(1, limit))
	}

	async player(id, options) {
		const economy = await this.economy(options)
		const row = economy.users[String(id)]
		return row ? { id: String(id), ...row } : null
	}

	/**
	 * where one player sits in the global list, 1 based, or 0 when they are not
	 * in it. same number no matter which server asked.
	 */
	async position(id, options) {
		const economy = await this.economy(options)
		const rows = rank(economy.users)
		const index = rows.findIndex(row => row.id === String(id))
		return index < 0 ? { place: 0, of: rows.length } : { place: index + 1, of: rows.length }
	}

	async totals(options) {
		const economy = await this.economy(options)
		return summarize(economy.users)
	}

	/**
	 * read, change, write back. the mutate function gets the freshest ledger and
	 * edits it in place, which is what makes retries safe: if someone else
	 * committed while we were thinking, the next attempt reads their version and
	 * applies the change on top instead of overwriting it.
	 */
	async update(mutate, options = {}) {
		this.queue = this.queue.then(
			() => this.updateOnce(mutate, options),
			() => this.updateOnce(mutate, options),
		)
		return this.queue
	}

	async updateOnce(mutate, { message, attempts = 3 } = {}) {
		if (!this.token) throw new Error('writing the ledger needs GITHUB_TOKEN')

		for (let attempt = 1; attempt <= attempts; attempt++) {
			const { sha, data } = await this.meta()
			const ledger = normalize(data)
			const result = mutate(ledger)

			const clean = normalize(ledger)
			clean.updatedAt = new Date().toISOString()

			const text = `${JSON.stringify(clean, null, '\t')}\n`
			const response = await this.put(text, message ?? 'economy: update', sha)

			if (response.ok) {
				this.invalidate()
				return result
			}

			// 409 is a stale sha, 422 is github saying the branch moved. both mean
			// read it again and redo the change on top.
			if ((response.status === 409 || response.status === 422) && attempt < attempts) continue

			const body = await response.text().catch(() => '')
			throw new Error(`could not write ${this.source}: ${response.status}${body ? ` ${body.slice(0, 200)}` : ''}`)
		}

		throw new Error(`gave up writing ${this.source} after ${attempts} tries`)
	}

	/** overwrite the whole file, for imports and scripts. no merge, on purpose */
	async save(ledger, options = {}) {
		if (!this.token) throw new Error('writing the ledger needs GITHUB_TOKEN')

		const clean = normalize(ledger)
		clean.updatedAt = new Date().toISOString()

		const text = `${JSON.stringify(clean, null, '\t')}\n`
		const { sha } = await this.meta()
		const response = await this.put(text, options.message ?? 'economy: replace ledger', sha)

		if (!response.ok) {
			const body = await response.text().catch(() => '')
			throw new Error(`could not write ${this.source}: ${response.status}${body ? ` ${body.slice(0, 200)}` : ''}`)
		}

		this.invalidate()
		return clean
	}

	/** sha of the file as it is on github right now, plus its contents */
	async meta() {
		const response = await fetch(
			`https://api.github.com/repos/${this.repo}/contents/${this.path}?ref=${encodeURIComponent(this.branch)}`,
			{
				headers: {
					accept: 'application/vnd.github+json',
					authorization: `Bearer ${this.token}`,
					'user-agent': 'arasaka-economy-bot',
				},
			},
		)

		if (response.status === 404) return { sha: null, data: blank() }

		if (!response.ok) {
			const body = await response.text().catch(() => '')
			throw new Error(`github ${response.status} reading ${this.source}${body ? `: ${body.slice(0, 200)}` : ''}`)
		}

		const json = await response.json()
		const text = Buffer.from(json.content ?? '', 'base64').toString('utf8')

		return { sha: json.sha ?? null, data: text ? JSON.parse(text) : blank() }
	}

	async put(text, message, sha) {
		const body = {
			message,
			content: Buffer.from(text, 'utf8').toString('base64'),
			branch: this.branch,
		}

		if (sha) body.sha = sha

		return fetch(`https://api.github.com/repos/${this.repo}/contents/${this.path}`, {
			method: 'PUT',
			headers: {
				accept: 'application/vnd.github+json',
				authorization: `Bearer ${this.token}`,
				'user-agent': 'arasaka-economy-bot',
				'content-type': 'application/json',
			},
			body: JSON.stringify(body),
		})
	}
}

function blank() {
	return { version: 1, currency: '€$', updatedAt: null, users: {} }
}

/**
 * takes the file as is, or a bare array of players, or a { players: [] }, or a
 * file that still has a purse per guild. the last one gets added together so
 * the rest of the bot only ever sees one balance per person.
 */
export function normalize(data) {
	const scoped = flatten(data)

	const users = {}
	const source = Array.isArray(scoped)
		? scoped
		: (scoped?.users ?? scoped?.players ?? scoped?.members ?? {})

	if (Array.isArray(source)) {
		for (const row of source) {
			const id = String(row?.id ?? row?.userId ?? '')
			if (!/^\d{15,25}$/.test(id)) continue
			users[id] = account(row)
		}
	} else if (source && typeof source === 'object') {
		for (const [id, row] of Object.entries(source)) {
			if (!/^\d{15,25}$/.test(id)) continue
			users[id] = account(row)
		}
	}

	return {
		version: Number(data?.version ?? 1),
		currency: String(data?.currency ?? '€$'),
		updatedAt: data?.updatedAt ?? data?.updated_at ?? null,
		users,
	}
}

/** folds a per guild file into one users map, leaves a flat file alone */
export function flatten(data) {
	const buckets = data?.guilds ?? data?.servers ?? data?.guild
	if (!buckets || Array.isArray(buckets)) return data

	const users = {}

	for (const id of Object.keys(buckets).sort()) {
		const bucket = buckets[id]
		if (!bucket || typeof bucket !== 'object') continue

		const rows = bucket.users ?? bucket.players ?? bucket.members ?? bucket
		if (!rows || typeof rows !== 'object') continue

		for (const [userId, row] of Object.entries(rows)) {
			if (!/^\d{15,25}$/.test(userId)) continue

			const next = account(row)
			users[userId] = users[userId] ? merge(users[userId], next) : next
		}
	}

	return {
		version: data?.version ?? 1,
		currency: data?.currency ?? '€$',
		updatedAt: data?.updatedAt ?? data?.updated_at ?? null,
		users,
	}
}

export function merge(a, b) {
	return {
		balance: a.balance + b.balance,
		earned: a.earned + b.earned,
		shifts: a.shifts + b.shifts,
		streak: Math.max(a.streak, b.streak),
		lastDaily: Math.max(a.lastDaily, b.lastDaily),
		lastWork: Math.max(a.lastWork, b.lastWork),
	}
}

export function account(row) {
	const number = value => {
		const parsed = Number(value)
		return Number.isFinite(parsed) ? parsed : 0
	}

	return {
		balance: number(row?.balance ?? row?.eddies ?? row?.amount),
		earned: number(row?.earned ?? row?.totalEarned),
		shifts: number(row?.shifts ?? row?.worked),
		streak: number(row?.streak ?? row?.dailyStreak),
		lastDaily: number(row?.lastDaily ?? row?.last_daily),
		lastWork: number(row?.lastWork ?? row?.last_work),
	}
}

export function rank(users) {
	return Object.entries(users ?? {})
		.map(([id, row]) => ({ id, ...row }))
		.sort((a, b) => b.balance - a.balance || b.earned - a.earned || a.id.localeCompare(b.id))
}

export function summarize(users) {
	const rows = Object.values(users ?? {})
	const total = rows.reduce((sum, row) => sum + row.balance, 0)
	const earned = rows.reduce((sum, row) => sum + row.earned, 0)
	const ranked = rank(users)

	return {
		players: rows.length,
		total,
		earned,
		average: rows.length ? Math.floor(total / rows.length) : 0,
		richest: ranked[0] ?? null,
	}
}

export const aradata = new Aradata()

export default aradata
