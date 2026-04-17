import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async () => {
  return new Response(
    JSON.stringify({
      status: "not_implemented",
      message: "Function scaffolded in Step 14.1."
    }),
    { headers: { "content-type": "application/json" } }
  );
});
