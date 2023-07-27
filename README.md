# noisyJS

> Simple random internet traffic generator.

### Installation

```shell
npm install @zachey/noisyjs -g
```

or

1. `git clone https://github.com/zachey01/noisyJS.git`
2. `npm i`
3. `npx noisyjs`

### Usage

`npx @zachey/noisyjs` - run with default config.

`npx @zachey/noisyjs --config yourcfg.json` - run with other config.

#### Example config

```json
{
  "root_urls": ["your urls"],
  "blacklisted_urls": ["your blacklist"],
  "user_agents": ["your user agents"]
}
```
