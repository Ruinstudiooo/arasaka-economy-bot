import { config } from '../config.js'

/**
 * one json file out of a github repo, cached. public repos go through
 * raw.githubusercontent, private ones through the api with a token, both hand
 * back the same thing.
 */
export class GitHubFile {
	constructor(options = {}) {
		this.repo = options.repo ?? config.aradata.repo
		this.branch = options.branch ?? config.aradata.branch
		this.path = options.path ?? config.aradata.path
		this.token = options.token ?? config.aradata.token
		this.ttl = options.ttl ?? config.aradata.ttl

		this.cache = null
		this.inflight = null
	}

	get source() {
		return `${this.repo}/${this.path}@${this.branch}`
	}

	get url() {
		if (this.token) {
			return `https://api.github.com/repos/${this.repo}/contents/${this.path}?ref=${encodeURIComponent(this.branch)}`
		}
		return `https://raw.githubusercontent.com/${this.repo}/${this.branch}/${this.path}`
	}

	get headers() {
		const headers = {
			accept: this.token ? 'application/vnd.github.raw' : 'application/json',
			'user-agent': 'arasaka-economy-bot',
		}
		if (this.token) headers.authorization = `Bearer ${this.token}`
		if (this.cache?.etag) headers['if-none-match'] = this.cache.etag
		return headers
	}

	fresh() {
		return Boolean(this.cache) && Date.now() - this.cache.at < this.ttl
	}

	/** parsed json, or the cached copy when github says nothing changed */
	async read({ force = false } = {}) {
		if (!force && this.fresh()) return this.cache.data
		if (this.inflight) return this.inflight

		this.inflight = this.fetchOnce(force).finally(() => {
			this.inflight = null
		})

		return this.inflight
	}

	async fetchOnce(force) {
		const response = await fetch(this.url, { headers: this.headers })

		if (response.status === 304 && this.cache) {
			this.cache.at = Date.now()
			return this.cache.data
		}

		if (!response.ok) {
			const body = await response.text().catch(() => '')
			const hint =
				response.status === 404
					? ` (is ${this.path} on ${this.branch} in ${this.repo}?)`
					: response.status === 401 || response.status === 403
						? ' (if the repo is private set GITHUB_TOKEN)'
						: ''

			throw new Error(`github ${response.status} for ${this.source}${hint}${body ? `: ${body.slice(0, 200)}` : ''}`)
		}

		const data = await response.json()

		this.cache = {
			data,
			at: Date.now(),
			etag: response.headers.get('etag'),
		}

		if (force) this.cache.at = Date.now()

		return data
	}

	/** drop the cache so the next read goes out to github */
	invalidate() {
		this.cache = null
	}
}

export default GitHubFile
