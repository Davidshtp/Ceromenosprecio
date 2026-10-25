import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sha1 = async (value: string) => {
  const buffer = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const handler = async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !cloudName || !apiKey || !apiSecret) {
    return json({ error: "Delete service is not configured" }, 500);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Authentication required" }, 401);

  const { data: restaurantUser } = await supabase
    .from("users")
    .select("restaurant_id")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!restaurantUser?.restaurant_id) {
    return json({ error: "Restaurant access not found" }, 403);
  }

  const body = (await request.json()) as { public_id?: string };
  const publicId = body.public_id?.trim();
  const expectedFolder = `restaurant-menu/${restaurantUser.restaurant_id}/`;
  if (!publicId || !publicId.startsWith(expectedFolder)) {
    return json({ error: "Invalid image reference" }, 400);
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await sha1(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`);
  const formData = new URLSearchParams({
    public_id: publicId,
    timestamp,
    api_key: apiKey,
    signature,
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    { method: "POST", body: formData }
  );
  const result = (await response.json()) as { result?: string; error?: { message?: string } };
  if (!response.ok || result.result === "error") {
    return json({ error: result.error?.message || "Cloudinary delete failed" }, 502);
  }

  return json({ success: true });
};

Deno.serve(handler);
