# Backend proxy client identity

The backend now limits authentication per account and applies a separate shared
source cap when the hosting proxy's visitor IP is unknown. This works without
new environment values and avoids sharing eight login attempts among all users.

For verified visitor IPs, set the same random `PROXY_CLIENT_IP_SECRET` (at least
32 characters, preferably generated with `openssl rand -hex 32`) on frontend
and backend. These values are server-only and must not use `NEXT_PUBLIC_`.
Set `PROXY_CLIENT_IP_HEADER` only to a header that the trusted hosting ingress
overwrites/appends. `PROXY_CLIENT_IP_FROM_RIGHT=1` selects the rightmost address;
the position must match the verified hosting chain, not an assumed client header.
Keep the header setting empty when this is unknown.

The frontend strips visitor-supplied signature headers, selects an actual IP,
and signs method, exact upstream path/query, timestamp and IP. The backend
accepts only a matching fresh HMAC signature. No arbitrary forwarding header is
trusted by default. Invalid/missing configuration keeps the account-based
fallback working. Deploy backend first; configuration is described in its
[proxy guide](https://github.com/thien-dev-77/baotin-backend/blob/develop/docs/proxy-client-ip.md).

`tests/backend-proxy.spec.ts` covers signing, configured address position,
invalid IPs, forged headers, request binding and normal proxy behavior.
