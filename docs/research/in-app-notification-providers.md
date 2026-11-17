# Survey: hosted in-app notification providers

Research for [#5](https://github.com/rgamarra/cohort-005-project/issues/5) (part of map [#4](https://github.com/rgamarra/cohort-005-project/issues/4)).
All sources checked **2026-11-17**. Prices are USD per month as shown on each vendor's public pricing page that day.
This is a survey, not a decision. Choosing a provider is a separate ticket.

Constraints: in-app only, inside the Cadence React Router web app. SaaS only. Free and paid tiers both count. Real-time is reported on but does not rule a provider out.

## Comparison

| | Knock | Novu Cloud | MagicBell | Courier | SuprSend |
|---|---|---|---|---|---|
| **Free tier** | 10,000 messages/mo | 10,000 workflow runs/mo, 5 workflows, 24h activity-feed retention, Novu branding | 1,000 deliveries/mo, 1 project | 10,000 sends/mo | 10,000 notifications/mo, SuprSend branding on feed |
| **First paid tier** | Starter $250/mo: 50k messages, then $0.005 each | Pro from $30/mo: 30k runs, then $1.20/1k | Startup $249/mo: 50k deliveries, then $0.0025 each | Business: $0.005 per send from the first send | Essentials $100/mo (annual): 50k, then $2/1k |
| **Mid tier** | Enterprise (custom) | Team from $250/mo: 250k runs, then $1.20/1k | Enterprise (custom) | Enterprise (custom, below $0.005/send) | Business $250/mo (annual): 50k, then $5/1k |
| **Cost at ~50k in-app msgs/mo** | $250 | about $54 (Pro: $30 + 20k × $1.20/1k) | $249 | about $250 | $100 |
| **Prebuilt React feed/inbox** | Yes: `NotificationFeedPopover`, `NotificationFeed`, `NotificationIconButton` | Yes: `<Inbox />` (Bell, Notifications, Preferences) | Yes: `Inbox`, `FloatingInbox` | Yes: `CourierInbox` | Yes: `<Inbox />` popover, full-screen, side sheet |
| **Prebuilt toast** | No. Docs build toasts with `react-hot-toast` on feed events | Not documented | Yes: `ToastContainer` | Yes | No, removed from Inbox by default |
| **Headless hooks** | Yes | Yes (`@novu/react`, `@novu/js`) | Not documented on the React page | Custom views plus low-level APIs | Yes (headless feed) |
| **Real-time** | WebSocket | WebSocket (`socketUrl` wss) | "Persistent connection", transport not named | "Real time", transport not named | Feed socket (`socketHost`) |
| **Read-state model** | seen, read, interacted, archived | read, snooze (others not stated on the inbox page) | read, seen, archived | read, opened, archived | not stated on the pages read |
| **Required recipient data** | `id` only | `subscriberId` only | `external_id` **or** email | `user_id` | `distinct_id` |
| **Client auth** | RS256 JWT signed by your backend (enhanced security mode) | HMAC-SHA256 `subscriberHash` | HS256 user JWT signed with the project secret | JWT minted by calling `POST /auth/issue-token` | ES256 JWT signed with the workspace signing key (enhanced security mode) |
| **Node SDK** | `@knocklabs/node`: `workflows.trigger` | `@novu/api`: `novu.trigger` | `magicbell-js`: `broadcasts.createBroadcast` | `@trycourier/courier`: `send.message` | `@suprsend/node-sdk`: `workflows.trigger` |
| **Environments** | Unlimited, each with its own keys | Dev + Prod (more on Team) | Projects (1 on free, 5 on Startup) | Test + Production | Sandbox, Staging (with Test Mode), Production |
| **Other channels later** | Yes | Yes | Yes | Yes | Yes |

Every candidate stores the notifications and their read state on its own servers. Cadence would hold no copy unless it stored one itself. The volume units differ, so read them carefully. Knock counts messages, Novu counts workflow runs, MagicBell counts deliveries per channel, Courier counts a send once across all its channels, and SuprSend counts notifications.

## Per-provider notes

### Knock

- **Pricing** ([pricing](https://knock.app/pricing)): Free is $0 for up to 10,000 messages. Free has no hard cap; Knock contacts you about billing instead. Starter is $250/mo for 50,000 messages, then $0.005 each. Enterprise is custom. On every plan, feeds per recipient and environments are unlimited, and feed retention is unlimited but configurable. Logs are kept for 30 days (90 on Enterprise).
- **React UI** ([React overview](https://docs.knock.app/in-app-ui/react/overview)): `@knocklabs/react` ships prebuilt components (`NotificationFeedPopover`, `NotificationFeed`, `NotificationIconButton`) and a complete set of headless hooks. It has no toast component; the [toasts guide](https://docs.knock.app/in-app-ui/react/toasts) uses `react-hot-toast` driven by real-time feed events.
- **Real-time and state** ([feeds overview](https://docs.knock.app/in-app-ui/feeds/overview)): Knock's real-time service pushes new feed messages over a websocket. Messages can be marked seen, read, interacted or archived, and the feed can be filtered by those states.
- **Recipients** ([users](https://docs.knock.app/concepts/users)): Only `id` is required. `name`, `avatar`, `email`, `phone_number` and `timezone` are optional; email is needed only for the email channel. Users can be identified inline in the trigger call ([workflow trigger API](https://docs.knock.app/api-reference/workflows/trigger)).
- **Client auth** ([security](https://docs.knock.app/in-app-ui/security-and-authentication)): The client uses the public key plus a user token. Your backend signs that JWT with RS256, using the private signing key from the Knock dashboard, with a `sub` claim. Knock says production "should enable enhanced security mode". Without it, anyone holding the public key can act as any user.
- **Server** ([trigger via API](https://docs.knock.app/send-notifications/triggering-workflows/api)): `knock.workflows.trigger(key, { recipients, data })` accepts up to 1,000 recipients per call and creates one workflow run per recipient.
- **Test/dev** ([environments](https://docs.knock.app/concepts/environments)): Development and production, plus optional extra environments, each with its own data and API keys. Knock does not document a mock or test mode.

### Novu Cloud

- **Pricing** ([pricing](https://novu.co/pricing)): Free gives 10,000 workflow runs/mo, up to 5 workflows, 2 environments, 3 team members and 24h activity-feed retention. Pro starts at $30/mo with 30,000+ runs, 20 workflows and 7-day retention. Team starts at $250/mo with 250,000+ runs, 100 workflows, up to 10 environments and 90-day retention. Overage on paid plans is $1.20 per 1,000 runs. Free shows Novu branding, which Pro removes. The page's inbox-specific rows (such as "Inbox feed retention") could not be matched to plans reliably. **Check the inbox feed retention per plan before choosing Novu.**
- **React UI** ([Inbox overview](https://docs.novu.co/platform/inbox/overview), [Inbox component](https://docs.novu.co/platform/inbox/react/components/inbox)): `<Inbox />` is built from Bell, Notifications, InboxContent and Preferences. Styles, elements and icons can be overridden, and Novu offers a Figma kit. It has tabs, filters, snooze and preferences built in. Headless hooks are in `@novu/react` and `@novu/js`. The pages read did not mention a toast component.
- **Real-time** ([prepare for production](https://docs.novu.co/platform/inbox/prepare-for-production)): WebSocket. The EU region uses `socketUrl: wss://eu.socket.novu.co`.
- **Recipients** ([subscribers](https://docs.novu.co/platform/concepts/subscribers)): Only `subscriberId` is required. Email, phone, names, locale, timezone and a free-form `data` object are optional. Subscribers are created or updated from the trigger's `to` field.
- **Client auth**: You turn on HMAC in the In-App integration settings. Your backend then computes `HMAC-SHA256(secretKey, subscriberId)` and passes it to the client as `subscriberHash`. Once HMAC is on, the Inbox will not load without the hash. Without HMAC, new subscribers are created on their first session, and nothing stops a client from impersonating another subscriber.
- **Server** ([TypeScript SDK](https://docs.novu.co/platform/sdks/server/typescript)): `@novu/api`, with `novu.trigger({ workflowId, to, payload })`.
- **Test/dev** ([environments](https://docs.novu.co/platform/concepts/environments)): Development and Production, each with its own Application Identifier and secret key. Workflows are edited in Development and published to Production. Novu does not document a mock.
- Novu is also open source and self-hostable. Self-hosting is out of scope here, so only Novu Cloud was considered.

### MagicBell

- **Pricing** ([pricing](https://www.magicbell.com/pricing)): Builder is free for 1,000 deliveries/mo and 1 project. Startup is $249/mo for 50,000 deliveries, then $0.0025 each, with 5 projects (extra projects cost $99). Enterprise is custom. MagicBell counts deliveries per channel. Free has the smallest allowance of any provider surveyed.
- **React UI** ([magicbell-react](https://www.magicbell.com/docs/libraries/magicbell-react)): `@magicbell/react` includes `Inbox`, `FloatingInbox`, `ToastContainer`, `InlineNotification` and `UserPreferences`. You can customise it through `ItemComponent`, `ButtonComponent` and `InboxComponent`, an `unstyled` option, CSS custom properties and fixed class names. The React page does not document headless hooks.
- **Real-time** ([in-app channel](https://www.magicbell.com/docs/channels/in_app)): The docs describe a "persistent connection" that delivers in real time without a page refresh. They do not name the transport.
- **State** ([notification](https://www.magicbell.com/docs/primitive/notification)): read, seen and archived, with `read_at` and `seen_at` timestamps.
- **Recipients** ([user](https://www.magicbell.com/docs/primitive/user)): Identify users by `external_id` (preferred, and it cannot be changed once set) or by email. Names and custom attributes are optional.
- **Client auth** ([user JWT](https://www.magicbell.com/docs/api/authentication/user)): Your backend signs the user JWT with HS256 using the project Secret Key. The claims are `api_key` plus `user_external_id` or `user_email`.
- **Server** ([magicbell-js](https://www.magicbell.com/docs/libraries/magicbell-js)): `magicbell-js/project-client`, with `client.broadcasts.createBroadcast({ title, content, recipients })`. Server calls authenticate with a project JWT created in the dashboard ([project JWT](https://www.magicbell.com/docs/api/authentication/project)).
- **Test/dev**: The docs do not describe separate environments. The nearest thing is separate projects, and Free allows only one.

### Courier

- **Pricing** ([pricing](https://www.courier.com/pricing)): Developer is free for up to 10,000 sends/mo. Adding a card moves you to Business, which charges $0.005 for every send, including the first 10,000. Enterprise is custom, below $0.005 per send. One send can go to several channels and still counts once.
- **React UI** ([inbox overview](https://www.courier.com/docs/platform/inbox/inbox-overview), [toasts](https://www.courier.com/docs/in-app/toasts.md)): `@trycourier/courier-react` (React 18+) provides `CourierInbox` and a prebuilt toast that supports themes, actions and auto-dismiss. You can theme it with `CourierInboxTheme`, pass in your own views, or build on low-level APIs. Web Components are also available. The older `@trycourier/react-inbox` packages are deprecated.
- **Real-time and state**: Messages arrive in real time and state syncs across a user's devices. The docs do not name the transport. Read, opened and archived states are built in.
- **Client auth** ([authenticate users](https://www.courier.com/docs/in-app/authenticate-users.md)): Your backend calls `POST /auth/issue-token` with the API key and a scope that includes `user_id:<id>`, `inbox:read:messages` and `inbox:write:events`. Set `expires_in`, because tokens never expire by default. The SDK does not refresh tokens, so your app calls `signIn` again with a new one.
- **Recipients / server** ([send to the inbox](https://www.courier.com/docs/in-app/send-to-the-inbox.md)): `@trycourier/courier` v7+ sends with `client.send.message({ message: { to: { user_id }, template, routing: { channels: ["inbox"] } } })`. Only `user_id` is needed for inbox delivery.
- **Test/dev** ([environments and API keys](https://courier.com/docs/platform/workspaces/environments-api-keys)): Test and Production environments with separate keys and data. "Courier has no separate test mode flag." The docs mention a Mock key type that requires Enterprise.
- The docs pages read did not say how long inbox messages are retained.

### SuprSend

- **Pricing** ([pricing](https://www.suprsend.com/pricing)): Free is 10,000 notifications/mo with SuprSend branding on the feed. Exceeding it does not stop delivery; SuprSend contacts you instead. Essentials is $100/mo billed annually for 50,000, then $2 per 1,000. Business is $250/mo billed annually for 50,000, then $5 per 1,000. Enterprise is custom. The pricing page lists in-app components, an embeddable and a headless inbox, feed filtering and toasts on every plan.
- **React UI** ([React inbox](https://docs.suprsend.com/docs/inbox-react), [drop-in feed](https://docs.suprsend.com/docs/react-in-app-feed.md)): `@suprsend/react` replaces the end-of-life `@suprsend/react-inbox`. It offers drop-in popover, full-screen and side-sheet feeds, plus a headless option. You can theme it and swap in your own bell, badge, card, empty state and header. The React docs say toasts are "no longer included in Inbox by default", which contradicts the pricing page.
- **Real-time**: The feed uses a socket (`socketHost`) and shows connection states from `ONLINE` to `OFFLINE`.
- **Client auth** ([client authentication](https://docs.suprsend.com/docs/client-authentication)): An ES256 JWT signed with the workspace signing key in PEM format. Its claims are `entity_type: "subscriber"`, `entity_id` (the user's `distinct_id`), `iat` and `exp`. Tokens are verified only when enhanced security mode is on.
- **Server** ([Node trigger](https://docs.suprsend.com/docs/node-trigger-workflow-from-api)): `@suprsend/node-sdk` 1.10.0 or later, using `supr_client.workflows.trigger(new WorkflowTriggerRequest({ workflow, recipients, data }))`. It supports bulk triggers. Some docs examples still use the older `trigger_workflow` syntax.
- **Test/dev** ([workspaces](https://docs.suprsend.com/docs/workspaces)): Sandbox, Staging and Production, each with its own keys. Staging has a Test Mode that delivers only to internal testers. This is the most explicit test support among the five.
- SuprSend's B2B multi-tenant support (per-tenant feeds) is a paid add-on. Cadence's Teams might map onto it.

### Others considered

- **Engagespot**: Its official pricing URL returned 404. Third-party listings say it has a free tier of about 10k triggers with an in-app inbox, but the paid prices they give conflict. Not verified against a primary source, so it is left out of the table.

## Faking the provider in tests

No provider documents a local in-process mock, apart from Courier's Mock key, which requires Enterprise. Every server SDK reduces to one "trigger" call (user id, event or workflow key, payload). That makes it straightforward to put a thin Cadence-owned `NotificationSender` interface in front of the SDK and swap in an in-memory fake under Vitest. Provider-hosted dev environments (Knock dev, Novu Development, Courier Test, SuprSend Staging with Test Mode) cover manual and integration testing. The client feed components always talk to the provider. A UI test would therefore need to use headless hooks over a fakeable data source, or stub the provider's client SDK.

## Trade-offs worth noting (not a recommendation)

- **Cheapest at small scale**: Novu Pro ($30 base) and SuprSend Essentials ($100, annual). Courier's free tier ends sharply: once a card is added, every send is billed.
- **Most complete prebuilt React UI including toasts**: MagicBell and Courier. Knock, and SuprSend's React SDK, expect you to build toasts yourself.
- **Least recipient data required**: all five accept a bare user id; none requires an email for in-app.
- **Every provider needs a server-signed or server-issued per-user credential** to be secure in production. Cadence will need a server route or loader that mints it for the current session user.
