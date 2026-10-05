import { proxyBackend, type BackendRouteContext } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forward = (request: Request, { params }: BackendRouteContext) => proxyBackend(request, ["images", ...params.path], "media");
export { forward as GET, forward as HEAD };
