import React, { useEffect, useState, useCallback } from "react";
import { Container, Heading, Text, Button, Card, Flex, Separator } from "@radix-ui/themes";
import { useAuth } from "../auth/hooks/useAuth.js";
import { fetchRecipes, fetchCategories, upsertRecipe, deleteRecipe, uploadImage } from "../api/recipes.js";
import RecipeEditModal from "../components/recipes/RecipeEditModal.jsx";
import RecipeDetailsModal from "../components/recipes/RecipeDetailsModal.jsx";
import RecipeSearchBar from "../components/recipes/RecipeSearchBar.jsx";

export default function RecipesPage() {
  const { user } = useAuth();

  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRecipe, setDetailsRecipe] = useState(null);

  const loadAll = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const uid = user?.id ?? null;
      const [cats, recs] = await Promise.all([
        fetchCategories(uid),
        fetchRecipes(uid, { search, categoryIds: selectedCats }),
      ]);
      setCategories(cats || []);
      setRecipes(recs || []);
    } catch (e) {
      setErr(e?.message || String(e));
      setCategories([]);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [user, search, selectedCats]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const toggleCategory = useCallback((name) => {
    setSelectedCats((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedCats([]);
  }, []);

  const startAdd = useCallback(() => {
    if (!user) { setErr("Sign in to add recipes."); return; }
    setErr(""); setEditing(null); setModalOpen(true);
  }, [user]);

  const startEdit = useCallback((r) => {
    const createdBy = r?.author?.created_by || null;
    const isPublic = !!r.is_public;
    const isYours = createdBy && user?.id && createdBy === user.id;
    if (!isYours || isPublic) { setErr("You can only edit your private recipes."); return; }
    setEditing({
      recipe_id: r.recipe_id,
      name: r.name || "",
      categories: Array.isArray(r.categories) ? r.categories : [],
      image_url: r.image_url || "",
      is_public: false,
      ingredients: Array.isArray(r.ingredients)
        ? r.ingredients.map((x) => ({
            ingredient_id: x.ingredient_id ?? x.id ?? x.ingredientId ?? null,
            name: x.name ?? "",
            unit: x.unit ?? "g",
            grams: Number(x.grams ?? x.weight_g ?? 0) || 0,
            note: x.note ?? "",
          }))
        : [],
    });
    setModalOpen(true);
  }, [user]);

  function openDetails(r) {
    setDetailsRecipe(r);
    setDetailsOpen(true);
  }

  async function resizeImage(file, { maxW = 1600, maxH = 1600, maxBytes = 600 * 1024 } = {}) {
    if (!(file instanceof Blob)) return { blob: file, name: file?.name || "image" };
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    let q = 0.9;
    let blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", q));
    while (blob && blob.size > maxBytes && q > 0.3) {
      q -= 0.1;
      blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", q));
    }
    const name = (file.name || "image").replace(/\.[^.]+$/, "") + ".jpg";
    return { blob: blob || file, name };
  }

  const handleSave = useCallback(async (form) => {
    if (!user) { setErr("Sign in to save."); return; }
    setSaving(true); setErr("");
    try {
      let image_url = form.image_url || "";
      if (form.imageFile) {
        const { blob, name } = await resizeImage(form.imageFile, { maxW: 1600, maxH: 1600, maxBytes: 600 * 1024 });
        const path = `user_${user.id}/${Date.now()}_${name}`;
        image_url = await uploadImage(blob, path, { upsert: true });
      }

      await upsertRecipe({
        recipe_id: editing?.recipe_id,
        user_id: user.id,
        name: form.name,
        image_url,
        categories: form.categories,
        is_public: false,
        ingredients: (form.ingredients || []).map((r) => ({
          ingredient_id: r.ingredient_id,
          name: r.name,
          unit: r.unit || "g",
          grams: Number(r.grams) || 0,
          note: r.note || "",
        })),
      });

      setModalOpen(false);
      setEditing(null);
      await loadAll();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }, [user, editing, loadAll]);

  const createdById = user?.id || null;
  const pub = recipes.filter((r) => r.is_public === true);
  const mine = recipes.filter((r) => r?.author?.created_by === createdById && !r.is_public);

  return (
    <Container size="3" py="6">
      <Flex justify="between" align="center" style={{ marginBottom: 12 }}>
        <div><Heading>Recipes</Heading></div>
        <Button onClick={startAdd}>Add recipe</Button>
      </Flex>

      <Card size="3" style={{ marginBottom: 12 }}>
        <RecipeSearchBar
          search={search}
          onSearchChange={setSearch}
          categories={categories}
          selectedCats={selectedCats}
          onToggleCategory={toggleCategory}
          onClear={clearFilters}
          onSubmit={loadAll}
        />
      </Card>

      {loading && <Text color="gray">Loading…</Text>}
      {err && <Text color="red">{err}</Text>}

      <Heading size="3" mt="2">Your private recipes</Heading>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, marginTop: 8 }}>
        {mine.map((r) => (
          <Card size="3" key={`mine-${r.recipe_id}`}>
            <Flex direction="column" gap="2">
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt={r.name}
                  style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6 }}
                  onError={(ev) => (ev.currentTarget.style.display = "none")}
                />
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Heading size="3" style={{ marginTop: 0 }}>{r.name}</Heading>
              </div>
              <Flex justify="end">
                <Button size="2" variant="soft" onClick={() => openDetails(r)}>Details</Button>
              </Flex>
            </Flex>
          </Card>
        ))}
        {!loading && mine.length === 0 && <Text color="gray">No private recipes yet.</Text>}
      </div>

      <Separator my="4" />

      <Heading size="3" mt="2">Public recipes</Heading>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, marginTop: 8 }}>
        {pub.map((r) => (
          <Card size="3" key={`pub-${r.recipe_id}`}>
            <Flex direction="column" gap="2">
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt={r.name}
                  style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6 }}
                  onError={(ev) => (ev.currentTarget.style.display = "none")}
                />
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Heading size="3" style={{ marginTop: 0 }}>{r.name}</Heading>
              </div>
              <Flex justify="end">
                <Button size="2" variant="soft" onClick={() => openDetails(r)}>Details</Button>
              </Flex>
            </Flex>
          </Card>
        ))}
        {!loading && pub.length === 0 && <Text color="gray">No public recipes match.</Text>}
      </div>

      <RecipeEditModal
        open={editOpen}
        onOpenChange={setModalOpen}
        initial={editing || undefined}
        categories={categories}
        saving={saving}
        err={err}
        onSave={handleSave}
      />

      <RecipeDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        recipe={detailsRecipe}
        canEdit={
          !!detailsRecipe &&
          !detailsRecipe.is_public &&
          detailsRecipe?.author?.created_by === user?.id
        }
        onEdit={() => {
          setDetailsOpen(false);
          startEdit(detailsRecipe);
        }}
        onDelete={async () => {
          if (!detailsRecipe) return;
          await deleteRecipe(detailsRecipe.recipe_id, user.id);
          setDetailsOpen(false);
          setDetailsRecipe(null);
          await loadAll();
        }}
      />
    </Container>
  );
}
