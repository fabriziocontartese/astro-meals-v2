import { supabase } from "../auth/supabaseClient.js";

const STORAGE_BUCKET = "recipe-images";
const PLACEHOLDER_BUCKET = "placeholder";
const PLACEHOLDER_KEY = "placeholder";

/* Resolve a stored path or normalize a Supabase public URL */
function resolveImageUrl(pathOrUrl) {
  if (!pathOrUrl) return null;

  // Path in our bucket -> public URL
  if (!/^https?:\/\//i.test(pathOrUrl)) {
    const clean = String(pathOrUrl).replace(/^\/+/, "");
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(clean);
    return data?.publicUrl || null;
  }

  // Already public
  if (/\/storage\/v1\/object\/public\//.test(pathOrUrl)) return pathOrUrl;

  // Supabase URL missing /public/
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
    // none
  }
  return pathOrUrl;
}

function getPlaceholderUrl() {
  const { data } = supabase.storage.from(PLACEHOLDER_BUCKET).getPublicUrl(PLACEHOLDER_KEY);
  return data?.publicUrl || null;
}

function withImageOrPlaceholder(row) {
  const url = resolveImageUrl(row?.image_url);
  return { ...row, image_url: url || getPlaceholderUrl() };
}

function normalizeRowsImage(rows) {
  return (rows || []).map(withImageOrPlaceholder);
}

/** Categories derived from recipes_v1.categories. */
export async function fetchCategories(userId) {
  let q = supabase.from("recipes_v1").select("categories,is_public,author");
  q = userId
    ? q.or(`is_public.eq.true,author->>created_by.eq.${userId}`)
    : q.eq("is_public", true);

  const { data, error } = await q;
  if (error) throw error;

  const set = new Set();
  for (const r of data || []) if (Array.isArray(r.categories)) r.categories.forEach((c) => c && set.add(c));
  return Array.from(set).sort((a, b) => a.localeCompare(b)).map((name) => ({ id: name, name }));
}

/** Recipes list with search and category filters. */
export async function fetchRecipes(userId, { search, categoryIds = [] } = {}) {
  let q = supabase
    .from("recipes_v1")
    .select("recipe_id,name,image_url,ingredients,categories,instructions,author,is_public,created_at")
    .order("created_at", { ascending: false });

  q = userId
    ? q.or(`is_public.eq.true,author->>created_by.eq.${userId}`)
    : q.eq("is_public", true);

  if (search) q = q.ilike("name", `%${search}%`);
  if (Array.isArray(categoryIds) && categoryIds.length) q = q.overlaps("categories", categoryIds);

  const { data, error } = await q;
  if (error) throw error;
  return normalizeRowsImage(data ?? []);
}

/** Convenience loader that scopes to current user, shows private + public. */
export async function fetchMyRecipes(params = {}) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id || null;
  return fetchRecipes(userId, params);
}

/** Single recipe. */
export async function fetchRecipeById(recipeId) {
  const { data, error } = await supabase
    .from("recipes_v1")
    .select("recipe_id,name,image_url,ingredients,categories,instructions,author,is_public,created_at")
    .eq("recipe_id", recipeId)
    .maybeSingle();
  if (error) throw error;
  return data ? withImageOrPlaceholder(data) : null;
}

/** Insert/update private recipe. Uses `author.created_by` for ownership. */
export async function upsertRecipe(recipe) {
  if (!recipe || !recipe.name) throw new Error("recipe.name is required");

  const author = { ...(recipe.author || {}), created_by: recipe.user_id || null };

  const payload = {
    recipe_id: recipe.recipe_id,
    name: recipe.name,
    image_url: recipe.image_url ?? null, // store STORAGE PATH
    categories: Array.isArray(recipe.categories) ? recipe.categories : [],
    ingredients: recipe.ingredients ?? null,
    // DB column is TEXT; accept string or {text}
    instructions:
      typeof recipe.instructions === "string"
        ? recipe.instructions
        : recipe.instructions?.text ?? null,
    author,
    is_public: false,
  };

  if (payload.recipe_id) {
    const { data: row, error: chkErr } = await supabase
      .from("recipes_v1")
      .select("is_public,author")
      .eq("recipe_id", payload.recipe_id)
      .maybeSingle();
    if (chkErr) throw chkErr;
    const owner = row?.author?.created_by || null;
    if (row?.is_public) throw new Error("Public recipes cannot be edited.");
    if (!owner || owner !== recipe.user_id) throw new Error("Not your recipe.");
  }

  const { data, error } = await supabase
    .from("recipes_v1")
    .upsert(payload, { onConflict: "recipe_id" })
    .select("recipe_id,name,image_url,ingredients,categories,instructions,author,is_public,created_at")
    .maybeSingle();
  if (error) throw error;
  return withImageOrPlaceholder(data);
}

/** Delete private recipe by owner. */
export async function deleteRecipe(recipeId, userId) {
  if (!userId) throw new Error("userId required to delete recipe");
  const { error } = await supabase
    .from("recipes_v1")
    .delete()
    .eq("recipe_id", recipeId)
    .eq("is_public", false)
    .eq("author->>created_by", userId);
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
