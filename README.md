# LinkJolt MCP Server

Set up and run your [LinkJolt](https://www.linkjolt.io) affiliate program from your AI assistant. Plan a commission, create a campaign, add tracking to your site, invite affiliates, approve sales and see who you owe, all in plain language.

LinkJolt is affiliate software for SaaS and online businesses that pay affiliates to promote their own product. It tracks sales through links and coupon codes on Stripe, Paddle, Polar, Creem, Lemon Squeezy, Gumroad and more, and takes 0% of affiliate sales.

## Two ways to connect

### 1. The hosted server (recommended)

```
https://www.linkjolt.io/api/mcp
```

Claude (claude.ai, Desktop and Code), ChatGPT, Cursor, VS Code and Windsurf connect to it directly. You sign in to LinkJolt in the browser the first time, so there is no API key to create or store. Step-by-step guides for each client: [linkjolt.io/developers/mcp](https://www.linkjolt.io/developers/mcp).

### 2. This package, for clients that only run a local command

`@linkjolt/mcp-server` is a small relay. It reads each MCP message from stdin, sends it to the hosted server with your API key, and writes the answer back. It has no tools of its own, so it always has exactly the hosted server's tools.

Create an API key at [linkjolt.io/merchant/api-keys](https://www.linkjolt.io/merchant/api-keys), then add this to your client's config:

```json
{
  "mcpServers": {
    "linkjolt": {
      "command": "npx",
      "args": ["-y", "@linkjolt/mcp-server"],
      "env": {
        "LINKJOLT_API_KEY": "lj_pk_your_key"
      }
    }
  }
}
```

Without `LINKJOLT_API_KEY`, only the three tools that need no account work. Node 18 or newer.

## Things to ask

- "What commission should I offer for a $49 a month product, and should I pay on renewals?"
- "Set up an affiliate program for my app and add the tracking to my Stripe checkout."
- "Invite sam@example.com to my main campaign."
- "Which sales from the last 30 days are waiting for approval? Flag anything odd."
- "Who do I owe, and how much in each currency?"
- "My affiliate says a sale from yesterday is missing. Find out why."

## Tools

**Before you have an account**

| Tool | What it does |
| --- | --- |
| `plan_affiliate_program` | Suggests a commission rate, renewal policy and approval setting from LinkJolt's published benchmarks of real SaaS programs |
| `get_linkjolt_plans` | Plans, prices, tracked-sales limits and what the connector can do on each plan |
| `switch_from_another_tool` | How to move a program from Rewardful, Tolt, FirstPromoter, Affonso or a CSV, with affiliates' old links still working |

**Set up**

| Tool | What it does |
| --- | --- |
| `get_setup_status` | Where the account is in setting up (business details, campaign, payment connection, first affiliate, first sale), the next step, and the tracking script for your site |
| `update_business` | Sets the business name and website |
| `create_campaign` | Creates a campaign: what affiliates earn per sale and where their links go |
| `update_campaign` | Changes a campaign's name, terms, link destination or status |
| `get_tracking_instructions` | The tracking steps for your payment platform, filled in with your own script |
| `check_tracking` | Checks the tracking script is live on your site and shows a test purchase once you make one |
| `invite_affiliate` | Emails one person an invitation to a campaign |

**Run**

| Tool | What it does |
| --- | --- |
| `get_program_overview` | This month's revenue, sales, commissions and top affiliates in one call |
| `get_stats` | Revenue, commissions, sales and clicks for any date range |
| `list_campaigns` / `get_campaign` | Campaigns with their stats |
| `list_affiliates` | Affiliates with earnings and clicks |
| `update_affiliate_status` | Approves or rejects an affiliate who applied |
| `list_conversions` | Tracked sales, filtered by status, campaign, affiliate or date |
| `create_conversion` | Records a sale for an affiliate by hand |
| `update_conversion` | Approves or rejects a sale waiting for review |
| `list_coupons` / `create_coupon` | Affiliate discount codes, and adds one (created in Stripe, Polar or Creem when connected) |
| `list_payouts` | The payout queue |
| `search` / `fetch` | Finds any campaign, affiliate, coupon or sale by text and opens it |

**Affiliate Teams (Scale plan)**

| Tool | What it does |
| --- | --- |
| `list_teams` / `get_team` | Teams with members, campaigns and targets |
| `list_team_goals` | A team's targets and progress this period |
| `list_awards` | Team bonus awards, for reconciliation |

## What it cannot do

It cannot send money. Payouts happen on your LinkJolt Payouts page. Approving a team bonus award is deliberately not a tool.

## Plans

New accounts get a 7-day free trial (a card is needed to start it, cancel anytime). The three planning tools need no account. On Professional the connector can read the program, set it up and run it: business details, campaigns, invitations, and approving or rejecting affiliates. Ultimate and Scale add recording, approving or rejecting sales, and adding coupon codes. Starter does not include the connector. Prices: [linkjolt.io/pricing](https://www.linkjolt.io/pricing).

## Security

Every call goes to LinkJolt's hosted server with your own sign-in or API key, and from there to the public [Developer API](https://www.linkjolt.io/developers/api), so plan limits, brand scoping, rate limits and the audit log apply exactly as they do to any other API client. The relay adds no access of its own and stores nothing. Logs go to stderr; stdout carries MCP messages only.

`LINKJOLT_MCP_URL` points the relay at another server (tests, local development).

## Develop

```bash
npm install
npm run build
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## Links

- [MCP setup guides](https://www.linkjolt.io/developers/mcp)
- [Developer API reference](https://www.linkjolt.io/developers/api)
- [LinkJolt plugin for Claude Code](https://github.com/Efesop/linkjolt-claude-plugin)
- Support: [ollie@linkjolt.io](mailto:ollie@linkjolt.io)

MIT licensed.
