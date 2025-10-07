import { supabase } from "../auth/supabaseClient.js";

const STORAGE_BUCKET = "recipe-images";

/** Build a working public URL from a stored path or normalize a full URL. */
function resolveImageUrl(pathOrUrl) {
  if (!pathOrUrl) return null;

  // Raw storage path -> public URL
  if (!/^https?:\/\//i.test(pathOrUrl)) {
    const clean = String(pathOrUrl).replace(/^\/+/, "");
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(clean);
    return data?.publicUrl || null;
  }

  // Full URL already public
  if (/\/storage\/v1\/object\/public\//.test(pathOrUrl)) return pathOrUrl;

  // Supabase URL missing /public/. Also force correct bucket if needed.
  try {
    const u = new URL(pathOrUrl);
    if (u.pathname.includes("/storage/v1/object/")) {
      if (!u.pathname.includes("/storage/v1/object/public/")) {
        u.pathname = u.pathname.replace("/storage/v1/object/", "/storage/v1/object/public/");
      }
      const after = u.pathname.split("/storage/v1/object/public/")[1];
      if (after) {
        const parts = after.split("/");
        if (parts[0] !== STORAGE_BUCKET) {
          parts[0] = STORAGE_BUCKET;
          u.pathname = "/storage/v1/object/public/" + parts.join("/");
        }
      }
      return u.toString();
    }
  } catch {
    // Ignore URL parsing errors and return original path
  }
  return pathOrUrl;
}

function normalizeRowsImage(rows) {
  return (rows || []).map((r) => ({ ...r, image_url: resolveImageUrl(r.image_url) }));
}

/** Categories derived from recipes_v1.categories. */
export async function fetchCategories(userId) {
  let q = supabase.from("recipes_v1").select("categories,instructions,is_public");
  if (userId) q = q.or(`is_public.eq.true,instructions->>created_by.eq.${userId}`);
  else q = q.eq("is_public", true);

  const { data, error } = await q;
  if (error) throw error;

  const set = new Set();
  for (const r of data || []) if (Array.isArray(r.categories)) r.categories.forEach((c) => c && set.add(c));
  return Array.from(set).sort((a, b) => a.localeCompare(b)).map((name) => ({ id: name, name }));
}

/** Recipes list with search and category filters. */
export async function fetchRecipes(userId, { search, categoryIds = [] } = {}) {
  let q = supabase.from("recipes_v1").select("*").order("created_at", { ascending: false });

  if (userId) q = q.or(`is_public.eq.true,instructions->>created_by.eq.${userId}`);
  else q = q.eq("is_public", true);

  if (search) q = q.ilike("name", `%${search}%`);
  if (Array.isArray(categoryIds) && categoryIds.length) q = q.overlaps("categories", categoryIds);

  const { data, error } = await q;
  if (error) throw error;
  return normalizeRowsImage(data ?? []);
}

/** Single recipe. */
export async function fetchRecipeById(recipeId) {
  const { data, error } = await supabase
    .from("recipes_v1")
    .select("*")
    .eq("recipe_id", recipeId)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, image_url: resolveImageUrl(data.image_url) } : null;
}

/** Insert/update private recipe. */
export async function upsertRecipe(recipe) {
  if (!recipe || !recipe.name) throw new Error("recipe.name is required");

  const instructions = { ...(recipe.instructions || {}), created_by: recipe.user_id || null };

  const payload = {
    recipe_id: recipe.recipe_id,
    name: recipe.name,
    image_url: recipe.image_url ?? null,          // store STORAGE PATH
    categories: Array.isArray(recipe.categories) ? recipe.categories : [],
    nutritional_value: recipe.nutritional_value ?? null,
    ingredients: recipe.ingredients ?? null,
    instructions,
    is_public: false,
  };

  if (payload.recipe_id) {
    const { data: row, error: chkErr } = await supabase
      .from("recipes_v1")
      .select("is_public,instructions")
      .eq("recipe_id", payload.recipe_id)
      .maybeSingle();
    if (chkErr) throw chkErr;
    const owner = row?.instructions?.created_by || null;
    if (row?.is_public) throw new Error("Public recipes cannot be edited.");
    if (!owner || owner !== recipe.user_id) throw new Error("Not your recipe.");
  }

  const { data, error } = await supabase
    .from("recipes_v1")
    .upsert(payload, { onConflict: "recipe_id" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Delete private recipe by owner. */
export async function deleteRecipe(recipeId, userId) {
  if (!userId) throw new Error("userId required to delete recipe");
  const { error } = await supabase
    .from("recipes_v1")
    .delete()
    .eq("recipe_id", recipeId)
    .eq("is_public", false)
    .eq("instructions->>created_by", userId);
  if (error) throw error;
  return true;
}

/** Upload to Storage and return the object PATH. */
export async function uploadImage(fileOrBuffer, path, options = {}) {
  if (!fileOrBuffer) throw new Error("file is required");
  const safePath = String(path).trim().replace(/^\/+/, "").replace(/\s+/g, "_");

  let contentType = "application/octet-stream";
  if (typeof File !== "undefined" && fileOrBuffer instanceof File && fileOrBuffer.type) contentType = fileOrBuffer.type;
  else if (fileOrBuffer?.type) contentType = fileOrBuffer.type;
  else if (/\.(jpe?g)$/i.test(safePath)) contentType = "image/jpeg";
  else if (/\.(png)$/i.test(safePath)) contentType = "image/png";
  else if (/\.(webp)$/i.test(safePath)) contentType = "image/webp";

  const { data: upData, error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(safePath, fileOrBuffer, {
      upsert: options.upsert ?? true,
      contentType,
      cacheControl: "31536000",
    });
  if (upErr) throw upErr;

  return upData.path; // store path; resolver builds public URL
}

/** Build a public URL from an object path. */
export function getPublicUrlFor(path) {
  try {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}
