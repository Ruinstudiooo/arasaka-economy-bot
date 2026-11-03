# arasaka economy bot

discord economy bot in plain javascript. every command is its own file, and the
same file answers to `!pay` and `/pay`.

built on discord.js 14, components v2 cards, data read from the
[aradata](https://github.com/Ruinstudiooo/aradata) repo.

## setup

```sh
npm install
cp .env.example .env     # token, client id, prefix
npm run deploy           # push the slash commands
npm start
```

## folders

```
src/
  commands/         one file per command, nested folders are fine
  events/           one file per discord event
  handlers/
    commands.js     loads and indexes the command files
    events.js       loads the event files
    execute.js      permissions, cooldowns, errors, the shared context
    args.js         prefix parsing, mentions, numbers
    cooldowns.js    in memory per user timers
  services/
    github.js       one cached json file out of a github repo
    aradata.js      the economy data, read from the aradata repo
  structures/
    Command.js      the shape every command follows
  ui/
    components.js   components v2 helpers (container, section, text, ...)
    reply.js        sends a card from a slash command or a message
    theme.js        colors, money, duration, timestamps
  client.js         builds the client, loads everything
  config.js         env file reader and config
  index.js          start here
  deploy-commands.js  registers the slash commands
data/               bot side copies of anything that needs to persist
```

## adding a command

create `src/commands/pay.js`:

```js
import { SlashCommandBuilder } from 'discord.js'
import { Command } from '../structures/Command.js'
import { card } from '../ui/components.js'
import { money, theme } from '../ui/theme.js'

export default new Command({
	name: 'pay',
	aliases: ['transfer'],
	category: 'economy',
	description: 'send eddies to someone',
	cooldown: 5_000,
	prefix: 'pay <user> <amount>',

	// leave this out and the command only works with the prefix
	slash: new SlashCommandBuilder()
		.setName('pay')
		.setDescription('send eddies to someone')
		.addUserOption(option => option.setName('user').setDescription('who').setRequired(true))
		.addIntegerOption(option => option.setName('amount').setDescription('how much').setRequired(true)),

	async execute(ctx) {
		const [target, amount] = ctx.args

		await ctx.reply(
			card({
				title: 'transfer',
				body: `sending ${money(amount)} to ${target}`,
				accent: theme.accent,
			}),
		)
	},
})
```

args come in the same order for both entry points, so `execute` never checks
where it was called from. `ctx.user`, `ctx.member`, `ctx.guild`, `ctx.channel`,
`ctx.reply()` and `ctx.followUp()` are there too.

## cards

`ctx.reply()` takes a components v2 container. the helpers in `ui/components.js`
cover most of it:

```js
card({ title, body, image, footer, accent })
container([section('text', avatarUrl), separator(), text('more')], { accent })
```

components v2 messages cannot also have `content` or `embeds`, which is why
everything goes through the container.

## data

the bot reads `data/economy.json` from the `aradata` repo on github.

```
ARADATA_REPO=Ruinstudiooo/aradata
ARADATA_BRANCH=main
ARADATA_PATH=data/economy.json
GITHUB_TOKEN=ghp_...
```

that repo is private, so `GITHUB_TOKEN` is required. a read only fine grained
token works, or a classic one with `repo`. without it the bot starts fine and
then every data read fails with a 404, because github hides the repo instead of
saying no.

the file is cached for 60 seconds, `ARADATA_TTL` changes that,
`client.aradata.invalidate()` drops it early.

```js
await client.aradata.top(10)
await client.aradata.player(userId)
await client.aradata.totals()
```

## icon

`assets/icon.png` is the avatar, 1024 square. it is drawn by
`assets/make-icon.py` with cairo, so a colour change is one line and a rerun:

```sh
python3 assets/make-icon.py
```

nothing here came out of an image model, it is circles, ticks and two glyphs.
drafts that did not make it are in `assets/alternates/`.

## notes

- no commands are committed yet, the folder is empty on purpose
- slash commands need `npm run deploy` after any change to their options
- `GUILD_ID` makes deploy instant instead of waiting on discord's global cache
