import { proxyBackend, type BackendRouteContext } from "@/lib/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forward = async (request: Request, { params }: BackendRouteContext) => proxyBackend(request, (await params).path, "media");
export { forward as GET, forward as HEAD };
