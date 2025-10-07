// src/api/recipes.js
import { supabase } from "../lib/supabaseClient.js";
const STORAGE_BUCKET = "recipes";

/** Categories still come from `categories` (unchanged). */
export async function fetchCategories(userId) {
  let q = supabase.from("categories").select("id,name,user_id,created_at").order("name", { ascending: true });
  if (userId) q = q.or(`user_id.eq.${userId},user_id.is.null`);
  else q = q.is("user_id", null);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Recipes now use `recipes_v1`. Ownership stored at instructions.created_by. */
export async function fetchRecipes(userId, { search, categoryIds = [] } = {}) {
  let q = supabase.from("recipes_v1").select("*").order("created_at", { ascending: false });

  if (userId) {
    // visible = public OR created_by == userId
    q = q.or(`is_public.eq.true,instructions->>created_by.eq.${userId}`);
  } else {
    q = q.eq("is_public", true);
  }

  if (search) q = q.ilike("name", `%${search}%`);

  // `recipes_v1.categories` is text[]; match overlap with selected category names or ids converted to names upstream
  if (Array.isArray(categoryIds) && categoryIds.length) q = q.overlaps("categories", categoryIds);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchRecipeById(id) {
  const { data, error } = await supabase.from("recipes_v1").select("*").eq("recipe_id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * Upsert into `recipes_v1`.
 * recipe = { recipe_id?, user_id, name, description, image_url, categories: string[], ingredients?: any[], nutritional_value?: any, is_public?: boolean }
 * Ownership is set at instructions.created_by.
 */
export async function upsertRecipe(recipe) {
  if (!recipe || !recipe.name) throw new Error("recipe.name is required");

  const instructions = {
    ...(recipe.instructions || {}),
    created_by: recipe.user_id || null,
  };

  const payload = {
    recipe_id: recipe.recipe_id, // undefined for insert
    name: recipe.name,
    description: recipe.description ?? "",
    image_url: recipe.image_url ?? null,
    categories: Array.isArray(recipe.categories) ? recipe.categories : [],
    ingredients: recipe.ingredients ?? null,
    nutritional_value: recipe.nutritional_value ?? null,
    instructions,
    is_public: !!recipe.is_public, // false = private to creator
  };

  const { data, error } = await supabase
    .from("recipes_v1")
    .upsert(payload, { onConflict: "recipe_id" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Only the creator can delete. */
export async function deleteRecipe(recipeId, userId) {
  if (!userId) throw new Error("userId required to delete recipe");
  const { error } = await supabase
    .from("recipes_v1")
    .delete()
    .eq("recipe_id", recipeId)
    .eq("instructions->>created_by", userId);
  if (error) throw error;
  return true;
}

/** Storage upload unchanged. */
export async function uploadImage(fileOrBuffer, path, options = { upsert: true }) {
  if (!fileOrBuffer) throw new Error("file is required");
  const { data: upData, error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, fileOrBuffer, options);
  if (upErr) throw upErr;
  const { data: urlData, error: urlErr } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(upData.path);
  if (urlErr) throw urlErr;
  return urlData?.publicUrl ?? null;
}

export function getPublicUrlFor(path) {
  try {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}
