import { sourceVersion } from "../../../scripts/source-version.mjs";

export const dynamic = "force-static";

export async function GET() {
  return Response.json(sourceVersion(), { headers: { "Cache-Control": "no-store" } });
}
