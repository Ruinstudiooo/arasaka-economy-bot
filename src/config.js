import { readFileSync } from 'node:fs'

/**
 * .env without a dependency. one key per line, # starts a comment, quotes are
 * stripped. anything already in the real environment wins.
 */
function readEnvFile(file = '.env') {
	const out = {}
	let raw

	try {
		raw = readFileSync(file, 'utf8')
	} catch {
		return out
	}

	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue

		const split = trimmed.indexOf('=')
		if (split < 1) continue

		const key = trimmed.slice(0, split).trim()
		let value = trimmed.slice(split + 1).trim()

		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1)
		}

		out[key] = value
	}

	return out
}

const file = readEnvFile()
const env = key => process.env[key] ?? file[key] ?? ''

function list(value) {
	return value
		.split(/[\s,]+/)
		.map(part => part.trim())
		.filter(Boolean)
}

export const config = {
	token: env('DISCORD_TOKEN'),
	clientId: env('CLIENT_ID'),
	guildId: env('GUILD_ID'),

	ownerIds: list(env('OWNER_IDS')),
	prefixes: list(env('PREFIX') || '!'),

	ledgerFile: env('LEDGER_FILE') || 'data/ledger.json',

	aradata: {
		repo: env('ARADATA_REPO') || 'Ruinstudiooo/aradata',
		branch: env('ARADATA_BRANCH') || 'main',
		path: env('ARADATA_PATH') || 'data/economy.json',
		token: env('GITHUB_TOKEN'),
		ttl: Number(env('ARADATA_TTL') || 60_000),
	},

	colors: {
		accent: 0xc8102e,
		dark: 0x0b0b0d,
		good: 0x2ecc71,
		bad: 0xe74c3c,
		warn: 0xf1c40f,
	},
}

export function requireToken() {
	if (!config.token) {
		console.error('no DISCORD_TOKEN in the environment or .env, nothing to start')
		process.exit(1)
	}
}
