import { proxyBackend, type BackendRouteContext } from "@/lib/backend-proxy";
import { publicCacheTagsForMutation } from "@/lib/public-cache-policy";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forward = async (request: Request, { params }: BackendRouteContext) => {
  const { path } = await params;
  const response = await proxyBackend(request, path, "api");
  for (const tag of publicCacheTagsForMutation(request.method, path, response.status)) {
    // The backend has committed: a cache failure must not report the write as failed.
    try { revalidateTag(tag, { expire: 0 }); }
    catch { console.error("Public storefront cache invalidation failed."); }
  }
  return response;
};
export { forward as GET, forward as HEAD, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
