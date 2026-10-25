import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const transformations: Record<string, string> = {
  logo: "c_fill,w_320,h_320,g_auto,q_auto,f_auto",
  banner: "c_fill,w_1600,h_560,g_auto,q_auto,f_auto",
  product: "c_fill,w_900,h_700,g_auto,q_auto,f_auto",
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

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
  const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
  const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !cloudName || !apiKey || !apiSecret) {
    return json({ error: "Upload service is not configured" }, 500);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return json({ error: "Authentication required" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: "Authentication required" }, 401);
  }

  const { data: restaurantUser, error: userError } = await supabase
    .from("users")
    .select("restaurant_id")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (userError || !restaurantUser?.restaurant_id) {
    return json({ error: "Restaurant access not found" }, 403);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const use = String(formData.get("use") || "product");

  if (!(file instanceof File) || !transformations[use]) {
    return json({ error: "A valid image and image type are required" }, 400);
  }

  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
    return json({ error: "Images must be under 8 MB" }, 400);
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = `restaurant-menu/${restaurantUser.restaurant_id}`;
  const signature = await sha1(
    `folder=${folder}&timestamp=${timestamp}${apiSecret}`
  );
  const cloudinaryData = new FormData();
  cloudinaryData.append("file", file);
  cloudinaryData.append("api_key", apiKey);
  cloudinaryData.append("timestamp", timestamp);
  cloudinaryData.append("folder", folder);
  cloudinaryData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: cloudinaryData }
  );
  const result = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };

  if (!response.ok || !result.secure_url) {
    return json(
      { error: result.error?.message || "Cloudinary upload failed" },
      502
    );
  }

  const url = result.secure_url.replace(
    "/upload/",
    `/upload/${transformations[use]}/`
  );
  return json({ url, public_id: result.public_id });
};

Deno.serve(handler);
