import { proxyBackend, type BackendRouteContext } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forward = (request: Request, { params }: BackendRouteContext) => proxyBackend(request, params.path, "api");
export { forward as GET, forward as HEAD, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
