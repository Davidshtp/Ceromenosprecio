import { supabase } from "../config/supabase";

export type CloudinaryImageUse = "logo" | "banner" | "product";

export interface CloudinaryImageAsset {
  url: string;
  public_id?: string;
}

export const getCloudinaryPublicId = (url: string) => {
  const uploadMarker = "/upload/";
  const uploadIndex = url.indexOf(uploadMarker);
  if (uploadIndex < 0) return undefined;

  const path = url.slice(uploadIndex + uploadMarker.length);
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return undefined;

  if (segments[0].includes(",")) segments.shift();
  if (segments[0]?.match(/^v\d+$/)) segments.shift();
  if (segments.length === 0) return undefined;

  const lastSegment = segments.length - 1;
  segments[lastSegment] = segments[lastSegment].replace(/\.[^/.]+$/, "");
  return segments.join("/");
};

const transformations: Record<CloudinaryImageUse, string> = {
  logo: "c_fill,w_320,h_320,g_auto,q_auto,f_auto",
  banner: "c_fill,w_1600,h_560,g_auto,q_auto,f_auto",
  product: "c_fill,w_900,h_700,g_auto,q_auto,f_auto",
};

export const uploadImageToCloudinary = async (
  file: File,
  use: CloudinaryImageUse
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("use", use);

  const { data, error } = await supabase.functions.invoke("upload-image", {
    body: formData,
  });

  if (error) {
    throw new Error(error.message || "No se pudo subir la imagen.");
  }

  if (!data?.url) {
    throw new Error("La carga no devolvió una URL de imagen.");
  }

  return data.url as string;
};

export const uploadImageAssetToCloudinary = async (
  file: File,
  use: CloudinaryImageUse
): Promise<CloudinaryImageAsset> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("use", use);

  const { data, error } = await supabase.functions.invoke("upload-image", {
    body: formData,
  });

  if (error) throw new Error(error.message || "No se pudo subir la imagen.");
  if (!data?.url) throw new Error("Cloudinary no devolvió la imagen subida.");

  return {
    url: data.url as string,
    public_id:
      (data.public_id as string | undefined) ||
      getCloudinaryPublicId(data.url as string),
  };
};

export const deleteImageFromCloudinary = async (publicId: string) => {
  const { error } = await supabase.functions.invoke("delete-image", {
    body: { public_id: publicId },
  });

  if (error) {
    throw new Error(error.message || "No se pudo eliminar la imagen.");
  }
};

export const getCloudinaryImageUrl = (
  url: string,
  use: CloudinaryImageUse
) => {
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/${transformations[use]}/`);
};
