import { aradata, rank } from './aradata.js'

/**
 * everything a command needs to touch money, in one place.
 *
 * there is no guild argument anywhere in this file and there never will be.
 * one wallet per discord user, shared by every server the bot is in, so a
 * player can earn in one place and spend in another. a guild only ever shows up
 * as a filter on the leaderboard, never as a separate balance.
 */
export class Economy {
	constructor(source = aradata) {
		this.source = source
	}

	get global() {
		return true
	}

	async ledger(options) {
		return this.source.economy(options)
	}

	/** the row for one person, made fresh if they are new. not saved until you write */
	async account(id, options) {
		const ledger = await this.ledger(options)
		const key = String(id)

		return { id: key, ...(ledger.users[key] ?? blankRow()) }
	}

	async balance(id, options) {
		const row = await this.account(id, options)
		return row.balance
	}

	/** richest first, the same list in every server */
	async top(limit = 10, options) {
		const ledger = await this.ledger(options)
		return rank(ledger.users).slice(0, Math.max(1, limit))
	}

	async position(id, options) {
		return this.source.position(id, options)
	}

	async totals(options) {
		return this.source.totals(options)
	}

	/**
	 * add or take money. positive amounts also count toward earned, negative
	 * ones only touch balance so a refund cannot fake a wage.
	 */
	async give(id, amount, options = {}) {
		const delta = whole(amount)
		if (!delta) throw new Error('that is not an amount')

		return this.source.update(
			ledger => {
				const row = (ledger.users[String(id)] ??= blankRow())
				row.balance = Math.max(0, row.balance + delta)
				if (delta > 0) row.earned += delta

				return { id: String(id), ...row, change: delta }
			},
			{ message: options.message ?? `economy: ${id} ${delta > 0 ? '+' : ''}${delta}` },
		)
	}

	/** one change inside one commit, so a payment is never half applied */
	async transfer(from, to, amount, options = {}) {
		const delta = whole(amount)
		if (!delta || delta < 0) throw new Error('that is not an amount')
		if (String(from) === String(to)) throw new Error('you cannot pay yourself')

		return this.source.update(
			ledger => {
				const payer = (ledger.users[String(from)] ??= blankRow())
				const payee = (ledger.users[String(to)] ??= blankRow())

				if (payer.balance < delta) {
					throw new Error(`only ${payer.balance} in the account`)
				}

				payer.balance -= delta
				payee.balance += delta
				payee.earned += delta

				return { from: String(from), to: String(to), amount: delta, payer: { ...payer }, payee: { ...payee } }
			},
			{ message: options.message ?? `economy: ${from} -> ${to} ${delta}` },
		)
	}

	/** sets specific fields, for jobs and daily streaks. never adds */
	async patch(id, fields, options = {}) {
		const clean = { ...fields }

		return this.source.update(
			ledger => {
				const row = (ledger.users[String(id)] ??= blankRow())

				for (const [key, value] of Object.entries(clean)) {
					if (!(key in row)) continue
					row[key] = Number(value) || 0
				}

				return { id: String(id), ...row }
			},
			{ message: options.message ?? `economy: ${id} ${Object.keys(clean).join(', ')}` },
		)
	}

	/** forces one entry to exist, so the first command that touches someone does not commit twice */
	async open(id, options = {}) {
		return this.source.update(
			ledger => {
				const row = (ledger.users[String(id)] ??= blankRow())
				return { id: String(id), ...row }
			},
			{ message: options.message ?? `economy: open ${id}` },
		)
	}
}

export function blankRow() {
	return {
		balance: 0,
		earned: 0,
		shifts: 0,
		streak: 0,
		lastDaily: 0,
		lastWork: 0,
	}
}

function whole(amount) {
	const number = Math.round(Number(amount))
	return Number.isFinite(number) ? number : 0
}

export const economy = new Economy()

export default economy
