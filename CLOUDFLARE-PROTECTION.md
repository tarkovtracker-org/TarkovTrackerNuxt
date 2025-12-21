# Cloudflare API Protection Setup

This document explains how to protect your `/api/tarkov/*` endpoints from abuse on Cloudflare Pages.

## Prerequisites

Before implementing the protection strategies in this document, ensure you have the following:

### Required Setup

1. **Existing Cloudflare Pages Project**
   - Your Nuxt application must already be deployed to Cloudflare Pages
   - You should have access to the Cloudflare Dashboard for your project
   - See: [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)

2. **Cloudflare Account Permissions**
   - **Edit** permissions for Pages projects
   - **Edit** permissions for Workers KV (if using Option C)
   - **Edit** permissions for Durable Objects (if using Option B)
   - For API token creation: Go to **My Profile** > **API Tokens** > **Create Token**
   - Recommended template: "Edit Cloudflare Workers" for full worker/KV/DO access

### For KV-Based Rate Limiting (Option C)

3. **KV Namespace Binding**
   - Create a KV namespace in **Workers & Pages** > **KV** > **Create a namespace**
   - Name it something like `RATE_LIMIT_KV`
   - Bind it to your Pages project:
     1. Go to **Workers & Pages** > Select your Pages project
     2. Navigate to **Settings** > **Functions** > **KV namespace bindings**
     3. Add a binding with variable name `RATE_LIMIT_KV` pointing to your namespace
   - See: [KV Bindings Documentation](https://developers.cloudflare.com/pages/functions/bindings/#kv-namespaces)

> **Note on Local Development:** KV namespace bindings must be configured in both the Cloudflare Dashboard for production and in your `wrangler.toml` file for local development with `wrangler dev`. Add the same binding variable name (e.g., `RATE_LIMIT_KV`) to your `wrangler.toml` and reference the [Wrangler/KV bindings docs](https://developers.cloudflare.com/workers/wrangler/configuration/#kv-namespaces) for the exact syntax and local development behavior.

### For Durable Objects Rate Limiting (Option B)

4. **Worker/Pages Functions Deployment**
   - Option B requires either:
     - A separate Cloudflare Worker deployed alongside your Pages project, OR
     - Using Pages Functions with a custom `_worker.js` file in your project root
   - Durable Objects must be configured in `wrangler.toml` and require a paid Workers plan
   - See: [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
   - See: [Pages Functions Advanced Mode](https://developers.cloudflare.com/pages/functions/advanced-mode/)

### Configuring Bindings in Pages Settings

All bindings (KV, Durable Objects, environment variables) are configured in:

- **Cloudflare Dashboard** > **Workers & Pages** > **[Your Project]** > **Settings** > **Functions**

Available binding types:

- **KV namespace bindings** - For Option C rate limiting
- **Durable Object bindings** - For Option B rate limiting
- **Environment variables** - For secrets and configuration

## Protection Layers

### 1. Origin Check Middleware (✅ Implemented)

The `server/middleware/api-protection.ts` middleware blocks requests from external origins.

**Configured allowed origins:**

```typescript
const allowedOrigins = [
  'https://tarkovtracker.org', // Production domain
  'https://www.tarkovtracker.org', // WWW variant
  'https://dev.tarkovtracker.org', // Development/staging domain
];
```

### 2. Cloudflare Rate Limiting (Recommended)

Cloudflare offers rate limiting on the free tier with some limits. Here's how to set it up:

#### Option A: Cloudflare Dashboard (Free Tier - 10 rules)

1. Go to your Cloudflare Dashboard
2. Navigate to **Security** > **WAF** > **Rate limiting rules**
3. Create a new rule:

**Rule Configuration:**

```
Rule name: Protect Tarkov API
Expression: (http.request.uri.path contains "/api/tarkov")
Characteristic: IP Address
Rate: 60 requests per 1 minute
Action: Block
Duration: 1 hour
```

This allows 60 requests per minute per IP, which is plenty for legitimate users but blocks bots.

#### Option B: Durable Objects (Recommended for True Atomicity)

Durable Objects provide true atomic operations since each instance runs in a single location
and processes requests sequentially. This is the recommended approach for accurate rate limiting.

> **Note:** Durable Objects require a paid Workers plan. Depending on your deployment model, you will either use **Pages Functions (Advanced Mode)** or a **Standalone Worker**.

##### 1. Pages Functions (Advanced Mode)

For Nuxt projects on Cloudflare Pages, use **Advanced Mode** by placing a `_worker.js` file in your project root. In this mode, you **must** configure Durable Object bindings in the Cloudflare Dashboard, not `wrangler.toml`.

**A. Create the Durable Object class:**

```javascript
// src/rate-limiter.js
export class RateLimiter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '60');
    const windowMs = parseInt(url.searchParams.get('window') || '60000'); // 1 minute

    // Get current window timestamp
    const now = Date.now();
    const windowKey = Math.floor(now / windowMs);

    // Atomic read-modify-write within the Durable Object
    let data;
    try {
      data = (await this.state.storage.get('rateLimit')) || { window: 0, count: 0 };
    } catch (err) {
      console.error(
        `Durable Object storage.get('rateLimit') failed: ${err.message || err}. Falling back to safe default.`,
        err
      );
      data = { window: 0, count: 0 };
    }

    // Reset if we're in a new window
    if (data.window !== windowKey) {
      data = { window: windowKey, count: 0 };
    }

    // Increment first, then check (atomic within DO)
    data.count += 1;

    try {
      await this.state.storage.put('rateLimit', data);
    } catch (err) {
      console.error(
        `Durable Object storage.put('rateLimit') failed: ${err.message || err}. Proceeding with in-memory state.`,
        err
      );
    }

    // Check if over limit AFTER incrementing
    if (data.count > limit) {
      return new Response(
        JSON.stringify({
          allowed: false,
          current: data.count,
          limit: limit,
          retryAfter: Math.ceil(((windowKey + 1) * windowMs) / 1000 - now / 1000),
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        current: data.count,
        limit: limit,
        remaining: limit - data.count,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
```

**B. Create the `_worker.js` entry point:**

```javascript
// _worker.js (in your Pages project root)
export { RateLimiter } from './src/rate-limiter.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only rate limit /api/tarkov/* paths
    if (url.pathname.startsWith('/api/tarkov')) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

      // Get the Durable Object instance for this IP
      const id = env.RATE_LIMITER.idFromName(ip);
      const rateLimiter = env.RATE_LIMITER.get(id);

      // Check rate limit atomically
      const rateLimitResponse = await rateLimiter.fetch(
        new Request(`https://rate-limiter/?limit=60&window=60000`)
      );

      if (rateLimitResponse.status === 429) {
        const data = await rateLimitResponse.json();
        return new Response('Rate limit exceeded', {
          status: 429,
          headers: {
            'Retry-After': data.retryAfter.toString(),
            'X-RateLimit-Limit': data.limit.toString(),
            'X-RateLimit-Remaining': '0',
          },
        });
      }
    }

    // Continue to your Nuxt app
    return env.ASSETS.fetch(request);
  },
};
```

**C. Bind via Cloudflare Dashboard:**

When using Pages Functions, you cannot use `wrangler.toml` for bindings. Instead:

1. Go to **Workers & Pages** > Select your Pages project.
2. Navigate to **Settings** > **Functions** > **Durable Object bindings**.
3. Add a binding:
   - **Variable name:** `RATE_LIMITER`
   - **Durable Object class:** `RateLimiter` (This refers to the class exported from your `_worker.js`).

##### 2. Standalone Worker (wrangler.toml)

If you are deploying a standalone Cloudflare Worker (not using Pages Functions Advanced Mode), you must configure bindings and migrations in your `wrangler.toml`.

**Configure wrangler.toml:**

```toml
[durable_objects]
bindings = [
  { name = "RATE_LIMITER", class_name = "RateLimiter" }
]

[[migrations]]
tag = "v1"
new_classes = ["RateLimiter"]
```

#### Option C: Cloudflare KV with Atomic-Style Pattern (Simpler, Less Precise)

If you don't need Durable Objects, you can use KV with an increment-first pattern.
Note: KV is eventually consistent, so this may allow slight overages under high concurrency,
but it's much better than the naive read-then-write approach.

```javascript
// _worker.js (in your Pages project root)
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only rate limit /api/tarkov/* paths
    if (url.pathname.startsWith('/api/tarkov')) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const windowMs = 60000; // 1 minute
      const limit = 60;
      const cacheKey = `ratelimit:${ip}:${Math.floor(Date.now() / windowMs)}`;

      // Increment-first pattern: increment, then check the result
      // This reduces the race window significantly
      const currentValue = await env.RATE_LIMIT_KV.get(cacheKey);
      const newCount = (parseInt(currentValue || '0', 10) + 1);

      // Write the incremented value immediately
      await env.RATE_LIMIT_KV.put(cacheKey, newCount.toString(), {
~       expirationTtl: 120, // Expire after 2 minutes
      });

      // Check AFTER incrementing - if we're over, we've already counted this request
      if (newCount > limit) {
        return new Response('Rate limit exceeded', {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
          }
        });
      }
    }

    // Continue to your Nuxt app
    return env.ASSETS.fetch(request);
  }
};
```

**Important:** The KV approach still has a race condition window between `get` and `put`.
For truly atomic rate limiting, use Durable Objects (Option B) or Cloudflare's built-in
rate limiting rules (Option A).

### 3. Monitor Usage

Check your Cloudflare Analytics regularly:

- **Dashboard** > **Analytics & Logs** > **Traffic**
- Look for unusual patterns in `/api/tarkov/*` requests
- Check the "Top Paths" section

If you see abuse:

1. The middleware will block most external requests
2. Rate limiting will block excessive requests from single IPs
3. You can add additional IP blocks in Cloudflare WAF

## Cloudflare Pages Limits (Free Tier)

- **Requests:** 100,000 per day
- **Function Invocations:** 100,000 per day
- **CPU Time:** 10ms per request

With the middleware + rate limiting, you should stay well within these limits with legitimate traffic.

## Additional Protection (If Needed)

### Add IP Allowlisting

If you need extra IP-level restrictions (e.g., for administrative access or specific trusted services), you can implement an IP allowlist.

**Note:** Since Cloudflare proxies all traffic to your application, the `CF-Connecting-IP` header (which our middleware uses) already provides the original client's IP address. Allowlisting Cloudflare's own IP ranges is **not appropriate** as it would effectively allow all traffic coming through Cloudflare, bypassing your intended restrictions.

```typescript
// In api-protection.ts, use specific trusted IPs:
const ALLOWED_CLIENT_IPS = [
  '1.2.3.4', // Example: Your office or build server IP
];
```

IP allowlisting is most useful for providing an additional layer of security for non-public endpoints. For the general `/api/tarkov/*` endpoints used by the application, the standard [Origin Check](#1-origin-check-middleware-implemented) and [Rate Limiting](#2-cloudflare-rate-limiting-recommended) are typically sufficient.

### Add Request Signing

For critical endpoints, add HMAC signatures:

```typescript
// Frontend creates signed request:
const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp + url));

// Backend verifies signature
```

## Testing Protection

Test that external requests are blocked:

```bash
# This should return 403 Forbidden (external curl request)
curl https://dev.tarkovtracker.org/api/tarkov/data?lang=en&gameMode=regular

# This should work when run in browser console on your site:
fetch('/api/tarkov/data?lang=en&gameMode=regular')
  .then(r => r.json())
  .then(console.log)
```

## Monitoring

Set up Cloudflare Notifications:

1. **Dashboard** > **Notifications**
2. Create alert for "Rate Limiting"
3. Create alert for "Functions Usage" (approaching limits)

This way you'll know if there's unusual activity.
