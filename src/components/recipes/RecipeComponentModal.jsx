// src/components/recipes/RecipeComponentModal.jsx

import React from "react";
import { Dialog, Button, Flex, Text, Card, Heading, Separator, Badge } from "@radix-ui/themes";
import { supabase } from "../../auth/supabaseClient.js";
import CategoryButton from "../ui/CategoryButton.jsx";

export default function RecipeComponentModal({
  open,
  onOpenChange,
  userId,
  onAfterChange, // call to refresh parent if needed
}) {
  // ---------- form / edit state ----------
  const empty = React.useRef({
    name: "",
    ingredients: [],
    categories: ["Component"],
    is_public: false,
  });
  const [form, setForm] = React.useState(empty.current);
  const [err, setErr] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const isEditing = Boolean(editingId);

  // ---------- ingredient search with category filters (parity with RecipeEditModal) ----------
  const [ingQuery, setIngQuery] = React.useState("");
  const [ingOptions, setIngOptions] = React.useState([]);
  const [ingCats, setIngCats] = React.useState([]);
  const [selectedIngCats, setSelectedIngCats] = React.useState([]);
  const [ingLoading, setIngLoading] = React.useState(false);
  const ingActive = ingQuery.trim().length >= 2 || selectedIngCats.length > 0;

  // ---------- existing components list ----------
  const [components, setComponents] = React.useState([]);
  const [loadingComps, setLoadingComps] = React.useState(false);

  // ---------- lifecycle ----------
  React.useEffect(() => {
    if (!open) return;
    resetForm();
    loadIngredientCategories();
    loadComponents();
  }, [open]);

  function resetForm() {
    setForm({ ...empty.current });
    setErr("");
    setSaving(false);
    setEditingId(null);
    setIngQuery("");
    setSelectedIngCats([]);
    setIngOptions([]);
  }

  async function loadIngredientCategories() {
    const { data, error } = await supabase
      .from("ingredients_v1")
      .select("category")
      .not("category", "is", null)
      .limit(1000);
    if (error) { setIngCats([]); return; }
    const set = new Set();
    for (const r of data || []) if (r.category) set.add(r.category);
    setIngCats(Array.from(set).sort().map((name) => ({ id: name, name })));
  }

  async function loadComponents() {
    setLoadingComps(true);
    try {
      const { data, error } = await supabase
        .from("recipes_v1")
        .select("recipe_id,name,ingredients,categories,author,is_public")
        .contains("categories", ["Component"])
        .order("name", { ascending: true })
        .limit(200);
      if (error) { setComponents([]); return; }
      setComponents(data || []);
    } finally {
      setLoadingComps(false);
    }
  }

  // ---------- ingredient search ----------
  const runIngredientSearch = React.useCallback(async (q, cats) => {
    if (!open) return;
    setIngLoading(true);
    try {
      let query = supabase
        .from("ingredients_v1")
        .select("ingredient_id,name,unit,category")
        .order("name", { ascending: true })
        .limit(50);
      if (q?.trim()?.length >= 2) query = query.ilike("name", `%${q.trim()}%`);
      if (cats?.length) query = query.in("category", cats);
      const { data, error } = await query;
      setIngOptions(!error ? data || [] : []);
    } finally {
      setIngLoading(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (!ingActive) { setIngOptions([]); return; }
    const t = setTimeout(() => runIngredientSearch(ingQuery, selectedIngCats), 220);
    return () => clearTimeout(t);
  }, [open, ingActive, ingQuery, selectedIngCats, runIngredientSearch]);

  function toggleIngCat(name) {
    setSelectedIngCats((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  }

  // ---------- ingredient rows ----------
  function addIngredientRow(o) {
    if (!o) return;
    setForm((f) => {
      if (f.ingredients?.some((r) => r.ingredient_id === o.ingredient_id && !r.type)) return f;
      return {
        ...f,
        ingredients: [
          ...(f.ingredients || []),
          { ingredient_id: o.ingredient_id, name: o.name, unit: o.unit || "g", grams: "" },
        ],
      };
    });
    setIngQuery("");
    setSelectedIngCats([]);
    setIngOptions([]);
  }

  function setRowGrams(id, grams) {
    const cleaned = String(grams).replace(/[^\d]/g, "");
    setForm((f) => ({ ...f, ingredients: f.ingredients.map((r) => (r.ingredient_id === id ? { ...r, grams: cleaned } : r)) }));
  }

  function removeRow(id) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((r) => r.ingredient_id !== id) }));
  }

  // ---------- save create / edit ----------
  const canSaveCreate = (form.name || "").trim().length > 0 && !saving && !isEditing;
  const canSaveEdit = (form.name || "").trim().length > 0 && !saving && isEditing;

  function normalizeIngredients(rows) {
    return (rows || []).map((r) => ({
      ingredient_id: r.ingredient_id,
      name: r.name,
      unit: r.unit || "g",
      grams: Number(r.grams) || 0,
      note: r.note || "",
    }));
  }

  async function saveComponent() {
    if (!userId) { setErr("Sign in to save."); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        name: form.name.trim(),
        ingredients: normalizeIngredients(form.ingredients),
        categories: ["Component"],
        is_public: false,
        author: { created_by: userId },
      };
      const { error } = await supabase.from("recipes_v1").insert(payload).select("recipe_id").single();
      if (error) throw error;
      await loadComponents();
      onAfterChange?.();
      resetForm();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdits() {
    if (!userId) { setErr("Sign in to save."); return; }
    if (!editingId) return;
    setSaving(true); setErr("");
    try {
      const payload = {
        name: form.name.trim(),
        ingredients: normalizeIngredients(form.ingredients),
        categories: ["Component"],
        is_public: Boolean(form.is_public),
      };
      const { error } = await supabase
        .from("recipes_v1")
        .update(payload)
        .eq("recipe_id", editingId)
        .select("recipe_id")
        .single();
      if (error) throw error;
      await loadComponents();
      onAfterChange?.();
      resetForm();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteComponent(id) {
    if (!id) return;
    setSaving(true); setErr("");
    try {
      const { error } = await supabase.from("recipes_v1").delete().eq("recipe_id", id);
      if (error) throw error;
      if (editingId === id) resetForm();
      await loadComponents();
      onAfterChange?.();
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c) {
    setForm({
      name: c?.name || "",
      ingredients: Array.isArray(c?.ingredients)
        ? c.ingredients.map((r) => ({
            ingredient_id: r.ingredient_id,
            name: r.name,
            unit: r.unit || "g",
            grams: r.grams ?? "",
            note: r.note || "",
          }))
        : [],
      categories: ["Component"],
      is_public: Boolean(c?.is_public),
    });
    setErr("");
    setIngQuery("");
    setSelectedIngCats([]);
    setIngOptions([]);
    setEditingId(c?.recipe_id || null);
  }

  function cancelEdit() {
    resetForm();
  }

  // ---------- UI ----------
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="980px" style={{ maxHeight: "85vh", overflow: "auto" }}>
        <Flex justify="between" align="center" mb="2">
          <Dialog.Title>Components</Dialog.Title>
          <Flex gap="2" align="center">
            {isEditing ? <Badge color="yellow">Editing</Badge> : null}
            {err ? <Text color="red">{err}</Text> : null}
            <Dialog.Close><Button variant="soft">Close</Button></Dialog.Close>
            {!isEditing && (
              <Button disabled={!canSaveCreate} onClick={saveComponent}>
                {saving ? "Saving…" : "Save new component"}
              </Button>
            )}
            {isEditing && (
              <>
                <Button variant="soft" color="gray" onClick={cancelEdit} disabled={saving}>Discard</Button>
                <Button disabled={!canSaveEdit} onClick={saveEdits}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </>
            )}
          </Flex>
        </Flex>

        <style>{`
          .comp-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
          @media (min-width: 900px){ .comp-grid { grid-template-columns: 1fr 1fr; } }
          .ing-grid { display:grid; grid-template-columns:1fr; gap:6px; }
          @media (min-width: 700px) { .ing-grid { grid-template-columns: 1fr 1fr; } }
          .search-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:6px; }
          .comp-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
          .comp-row h4 { margin:0; }
          .editing-bg { background: var(--yellow-3, #FFF7CC); }
        `}</style>

        <div className="comp-grid">

        {/* RIGHT: EXISTING COMPONENTS (HORIZONTAL CARDS + DELETE + EDIT HIGHLIGHT) */}
        <Card p="3">
            <Heading size="3" mb="2">Existing Components</Heading>
            {loadingComps ? <Text color="gray">Loading…</Text> : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {components.map((c) => {
                const mine = Boolean(userId) && Boolean(c?.author?.created_by) && c.author.created_by === userId;
                const isRowEditing = c.recipe_id === editingId;
                return (
                  <Card
                    key={c.recipe_id}
                    size="2"
                    className={isRowEditing ? "editing-bg" : ""}
                    style={{ padding: 10 }}
                  >
                    <div className="comp-row">
                      <Heading as="h4" size="3">{c.name}</Heading>
                      <Flex gap="2" align="center">
                        <Button
                          variant="soft"
                          size="2"
                          onClick={() => startEdit(c)}
                          disabled={!mine}
                          title={mine ? "Edit component" : "Only the creator can edit"}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="soft"
                          color="red"
                          size="2"
                          onClick={() => deleteComponent(c.recipe_id)}
                          disabled={!mine || saving}
                          title={mine ? "Delete component" : "Only the creator can delete"}
                        >
                          Delete
                        </Button>
                      </Flex>
                    </div>
                  </Card>
                );
              })}
              {!loadingComps && !components.length && <Text color="gray">No components yet.</Text>}
            </div>
          </Card>


          {/* LEFT: CREATE / EDIT FORM */}
          <Card p="3">
            <Heading size="3" mb="2">{isEditing ? "Edit Component" : "Create new Component"}</Heading>
            <Flex direction="column" gap="3">
              <div>
                <Text size="2">Name</Text>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={{ width: "100%", padding: 8 }}
                />
              </div>

              <Separator my="2" />
              <Heading size="2">Ingredients</Heading>

              {/* Category filters (parity with RecipeEditModal) */}
              <Flex gap="2" wrap mt="1">
                {ingCats.map((c) => (
                  <CategoryButton
                    key={c.id}
                    label={c.name}
                    checked={selectedIngCats.includes(c.name)}
                    onClick={() => toggleIngCat(c.name)}
                  />
                ))}
                {!!ingCats.length && (
                  <Button size="1" variant="soft" onClick={() => setSelectedIngCats([])}>Clear filters</Button>
                )}
              </Flex>

              {/* Search bar */}
              <Flex gap="2" align="center">
                <input
                  placeholder="Search ingredients… (min 2 chars or use filters)"
                  value={ingQuery}
                  onChange={(e) => setIngQuery(e.target.value)}
                  style={{ flex: 1, padding: 8 }}
                />
                <Button size="2" onClick={() => { if (ingActive) runIngredientSearch(ingQuery, selectedIngCats); }}>
                  {ingLoading ? "Searching…" : "Search"}
                </Button>
              </Flex>

              {/* Search results */}
              {ingActive && (
                <div style={{ maxHeight: 140, overflowY: "auto", paddingRight: 4, marginBottom: 8 }}>
                  <div className="search-grid">
                    {ingOptions.map((o) => (
                      <Card key={o.ingredient_id} size="1" style={{ padding: "6px 8px", lineHeight: 1.2 }}>
                        <Flex justify="between" align="center">
                          <Text>{o.name}</Text>
                          <Button size="1" onClick={() => addIngredientRow(o)}>Add</Button>
                        </Flex>
                      </Card>
                    ))}
                    {!ingOptions.length && <Text color="gray">No matches.</Text>}
                  </div>
                </div>
              )}

              {/* Current rows */}
              <div>
                {(form.ingredients || []).map((r) => (
                  <Card key={r.ingredient_id} size="1" style={{ padding: "6px 8px", marginBottom: 6 }}>
                    <Flex align="center" justify="between" gap="2">
                      <Text>{r.name}</Text>
                      <Flex align="center" gap="2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          value={r.grams}
                          onChange={(e) => setRowGrams(r.ingredient_id, e.target.value)}
                          style={{ width: 60, padding: 6, textAlign: "right" }}
                          aria-label="grams"
                        />
                        <Text>g</Text>
                        <Button size="1" variant="soft" color="gray" onClick={() => removeRow(r.ingredient_id)}>×</Button>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
                {(form.ingredients || []).length === 0 && <Text color="gray">No ingredients yet.</Text>}
              </div>
            </Flex>
          </Card>

        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
