import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const PROXY_IP_HEADERS = { ip: "x-baotin-client-ip", timestamp: "x-baotin-proxy-timestamp", signature: "x-baotin-proxy-signature" } as const;
const MIN_PROXY_SECRET_LENGTH = 32;
const MAX_HEADER_ENTRIES = 10;

// Configure only a header overwritten/appended by the hosting provider's trusted
// ingress. No arbitrary browser-supplied forwarding header is trusted by default.
export function proxyClientIpHeaders(incoming: Headers, method: string, path: string, now = Date.now()) {
  const secret = process.env.PROXY_CLIENT_IP_SECRET || "";
  const header = process.env.PROXY_CLIENT_IP_HEADER?.trim().toLowerCase();
  const position = Number(process.env.PROXY_CLIENT_IP_FROM_RIGHT || "1");
  if (secret.length < MIN_PROXY_SECRET_LENGTH || !header || !/^[a-z0-9-]+$/.test(header) || !Number.isInteger(position) || position < 1 || position > MAX_HEADER_ENTRIES) return {};
  const values = incoming.get(header)?.split(",").map(value => value.trim()) || [];
  const ip = values[values.length - position];
  if (!ip || !isIP(ip)) return {};
  const timestamp = String(Math.floor(now / 1000));
  const message = ["v1", timestamp, method.toUpperCase(), path, ip].join("\n");
  return { [PROXY_IP_HEADERS.ip]: ip, [PROXY_IP_HEADERS.timestamp]: timestamp, [PROXY_IP_HEADERS.signature]: createHmac("sha256", secret).update(message).digest("hex") };
}
