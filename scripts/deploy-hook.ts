/**
 * Fire the Vercel Deploy Hook so the freshly synced catalog gets a
 * rebuild — with `dynamicParams = false` on the detail routes, a row
 * has no page until the next build, so the sync and the deploy are
 * one pipeline.
 *
 * Env-gated like every optional integration: without the URL the call
 * is a logged no-op, so the sync runs anywhere. The URL itself is a
 * secret — anyone holding it can trigger deploys — so it lives in
 * .env.local and the repo's Actions secrets, never in code, and is
 * never echoed.
 *
 * @throws When the hook responds non-2xx, failing the calling script
 *   (and with it the scheduled workflow, whose failure emails Sauel).
 */
export async function fireDeployHook(): Promise<void> {
  const url = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!url) {
    console.log("deploy hook: skipped (VERCEL_DEPLOY_HOOK_URL not set)");
    return;
  }
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`deploy hook failed: ${res.status}`);
  }
  console.log("deploy hook: fired");
}
