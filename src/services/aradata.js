import { GitHubFile } from './github.js'
import { config } from '../config.js'

/**
 * the economy data lives in the aradata repo, not in the bot. the bot reads it,
 * keeps a short cache, and that is it. write side comes later.
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

	async totals(options) {
		const economy = await this.economy(options)
		return summarize(economy.users)
	}
}

/** takes the file as is, or a bare array of players, or a { players: [] } */
export function normalize(data) {
	const users = {}

	const source = Array.isArray(data)
		? data
		: (data?.users ?? data?.players ?? data?.members ?? {})

	if (Array.isArray(source)) {
		for (const row of source) {
			const id = String(row?.id ?? row?.userId ?? '')
			if (!id) continue
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

function account(row) {
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
		.sort((a, b) => b.balance - a.balance || b.earned - a.earned)
}

export function summarize(users) {
	const rows = Object.values(users ?? {})
	const total = rows.reduce((sum, row) => sum + row.balance, 0)
	const earned = rows.reduce((sum, row) => sum + row.earned, 0)
	const richest = rank(users)[0] ?? null

	return {
		players: rows.length,
		total,
		earned,
		average: rows.length ? Math.floor(total / rows.length) : 0,
		richest,
	}
}

export const aradata = new Aradata()

export default aradata
