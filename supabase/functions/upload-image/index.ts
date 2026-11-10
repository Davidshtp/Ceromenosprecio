// @ts-ignore Deno resolves remote URL imports at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const transformations: Record<string, string> = {
  logo: "c_pad,w_320,h_320,b_auto,q_auto,f_auto",
  banner: "c_limit,w_1600,h_560,q_auto,f_auto",
  product: "c_limit,w_1200,q_auto,f_auto",
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const json = (
  body: Record<string, unknown>,
  status = 200,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const sha1 = async (value: string): Promise<string> => {
  const buffer = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const handler = async (request: Request): Promise<Response> => {
  // CORS: permitir las solicitudes previas del navegador.
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // 1. Obtener la configuración del servidor.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey ||
      !cloudName ||
      !apiKey ||
      !apiSecret
    ) {
      console.error("Falta configurar uno o más secretos del servidor.");

      return json({
        error: "Upload service is not configured",
      }, 500);
    }

    // 2. Validar el encabezado de autenticación.
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return json({
        error: "Authentication required",
      }, 401);
    }

    // 3. Cliente exclusivo para validar la identidad del usuario.
    // No utiliza la clave de servicio para autenticar al usuario.
    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error(
        "Error de autenticación:",
        authError?.message ?? "Usuario no encontrado",
      );

      return json({
        error: "Authentication required",
      }, 401);
    }

    // 4. Cliente administrativo independiente.
    // No hereda el Authorization del usuario.
    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );

    // 5. Verificar que el usuario tenga un restaurante activo asociado.
    const { data: restaurantUser, error: userError } = await adminClient
      .from("users")
      .select("restaurant_id")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (userError) {
      console.error(
        "Error consultando el usuario del restaurante:",
        userError.message,
      );

      return json({
        error: "Could not verify restaurant access",
      }, 500);
    }

    if (!restaurantUser?.restaurant_id) {
      return json({
        error: "Restaurant access not found",
      }, 403);
    }

    // 6. Leer y validar el archivo.
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return json({
        error: "Invalid multipart form data",
      }, 400);
    }

    const file = formData.get("file");
    const use = String(formData.get("use") || "product");

    if (!(file instanceof File)) {
      return json({
        error: "A valid image file is required",
      }, 400);
    }

    if (!Object.hasOwn(transformations, use)) {
      return json({
        error: "Invalid image type. Use logo, banner or product",
      }, 400);
    }

    if (file.size === 0) {
      return json({
        error: "The image file is empty",
      }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return json({
        error: "Images must be under 8 MB",
      }, 400);
    }

    const allowedMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ]);

    if (!allowedMimeTypes.has(file.type)) {
      return json({
        error: "Unsupported image format. Use JPEG, PNG, WebP, GIF or AVIF",
      }, 400);
    }

    // 7. Preparar la subida a Cloudinary.
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = `restaurant-menu/${restaurantUser.restaurant_id}`;

    // Cloudinary exige firmar los parámetros en orden alfabético,
    // seguidos del API secret.
    const signature = await sha1(
      `folder=${folder}&timestamp=${timestamp}${apiSecret}`,
    );

    const cloudinaryData = new FormData();

    cloudinaryData.append("file", file, file.name);
    cloudinaryData.append("api_key", apiKey);
    cloudinaryData.append("timestamp", timestamp);
    cloudinaryData.append("folder", folder);
    cloudinaryData.append("signature", signature);

    // 8. Subir la imagen a Cloudinary.
    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      {
        method: "POST",
        body: cloudinaryData,
      },
    );

    let cloudinaryResult: {
      secure_url?: string;
      public_id?: string;
      error?: {
        message?: string;
      };
    };

    try {
      cloudinaryResult = await cloudinaryResponse.json();
    } catch {
      console.error(
        "Cloudinary devolvió una respuesta que no es JSON.",
        cloudinaryResponse.status,
      );

      return json({
        error: "Invalid response from Cloudinary",
      }, 502);
    }

    if (
      !cloudinaryResponse.ok ||
      !cloudinaryResult.secure_url ||
      !cloudinaryResult.public_id
    ) {
      const cloudinaryError =
        cloudinaryResult.error?.message || "Cloudinary upload failed";

      console.error("Error de Cloudinary:", {
        status: cloudinaryResponse.status,
        error: cloudinaryError,
      });

      return json({
        error: cloudinaryError,
      }, 502);
    }

    // 9. Construir la URL optimizada.
    const optimizedUrl = cloudinaryResult.secure_url.replace(
      "/upload/",
      `/upload/${transformations[use]}/`,
    );

    // 10. Devolver la información de la imagen.
    return json({
      url: optimizedUrl,
      public_id: cloudinaryResult.public_id,
    });
  } catch (error) {
    console.error(
      "Error inesperado en upload-image:",
      error instanceof Error ? error.message : error,
    );

    return json({
      error: "Internal server error while uploading image",
    }, 500);
  }
};

Deno.serve(handler);
