# n8n-nodes-megomi

This is an n8n community node for the [Megomi API](https://www.megomi.my.id/docs/). It lets you read public **TikTok**, **Instagram**, **Threads** and **YouTube** data in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation) ·
[Credentials](#credentials) ·
[Operations](#operations) ·
[Usage](#usage) ·
[Compatibility](#compatibility) ·
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation, and install the package `n8n-nodes-megomi`.

## Credentials

1. Sign in at [app.megomi.my.id](https://app.megomi.my.id) with Google or GitHub and create an API key.
2. In n8n, create a **Megomi API** credential and paste the key. It is sent as `Authorization: Bearer <key>`.
3. **Base URL** defaults to `https://api.megomi.my.id`. Only change it for a staging or self-hosted API.

Credits are bought in the Megomi dashboard.

## Operations

Every operation uses one credit unless noted. Only a successful (`200`) response is charged; errors, `404`, `429` and `503` are free, and repeating a request your key already paid for within the cache window is free.

| Resource | Operation | Credits |
|---|---|---|
| TikTok | Get Video | 1 (extended options use the same price) |
| TikTok | Get Transcript | 1 (separate cache from Get Video) |
| TikTok | Get Profile | 1 |
| TikTok | Get Comments | 1 per page of 20 (empty pages are free) |
| TikTok | Get Trending Hashtags | 1 |
| TikTok | Get Trending Feed | 1 per page |
| TikTok | Get Song | 1 |
| Instagram | Get Post | 1 (+9 with *Download Media*) |
| Instagram | Get Profile | 1 |
| Threads | Get Post | 1 (0 if the replies could not be read) |
| Threads | Get Profile | 1 |
| YouTube | Get Video | 1 |

The credit cost is also shown in each operation's description inside n8n.

## Usage

- **Get Comments** supports **Return All** and **Limit**. The node follows the API's cursor (`next_cursor` / `has_more`) page by page and returns one n8n item per comment. Each page costs one credit, so use **Limit** to cap spend. Set **Replies To Comment ID** to read the replies of one comment.
- **Get Trending Feed** has no pagination: every call returns a new page of videos, one item per video.
- **Extended Response** (TikTok Get Video, Instagram Get Post) sends the URL as a query parameter and unlocks extra options such as *Include Products* or *Download Media*. Instagram *Download Media* costs 9 extra credits and is charged only if every file is stored.
- **Timeouts:** the API waits up to 45 seconds for a result (comments can take up to about 55 seconds). The node's request timeout is 60 seconds.
- **Retries:** `503` (no result in time) and `429` (rate limit) are never charged, so the node retries them up to two times, waiting for the `Retry-After` header (capped at 20 seconds). Other errors are not retried.
- **Errors** are translated into plain messages, for example `402` becomes "Not enough credits" and `403` explains that the source platform blocked the lookup.
- Media URLs returned by the platforms (avatars, images, videos) expire. Download anything you need to keep.

## Compatibility

Built and tested against n8n with `n8nNodesApiVersion` 1. The package has no runtime dependencies.

## Resources

- [Megomi API documentation](https://www.megomi.my.id/docs/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Report an issue](https://github.com/megomi/n8n-nodes-megomi/issues)

## License

[MIT](LICENSE)
