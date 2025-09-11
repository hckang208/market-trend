// netlify/functions/trigger_build.js
export async function handler() {
  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  if (!hook) return { statusCode: 500, body: "NETLIFY_BUILD_HOOK_URL not set" };
  try {
    const r = await fetch(hook, { method: "POST" });
    return { statusCode: r.ok ? 200 : 500, body: r.ok ? "OK" : "FAIL" };
  } catch (e) {
    return { statusCode: 500, body: `ERR ${e?.message||e}` };
  }
}
