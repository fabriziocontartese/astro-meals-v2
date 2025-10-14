// src/components/recipes/RecipeEditModal.jsx

import React from "react";
import { Dialog, Button, Flex, Text, Card, Heading, SegmentedControl } from "@radix-ui/themes";
import { supabase } from "../../auth/supabaseClient.js";
import CategoryButton from "../ui/CategoryButton.jsx";

const STORAGE_BUCKET = "recipe-images";
const PRESET_CATS = ["Breakfast", "Lunch", "Dinner", "Snack"];

function toPublicUrlIfNeeded(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (!/^https?:\/\//i.test(pathOrUrl)) {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(String(pathOrUrl));
    return data?.publicUrl || "";
  }
  if (/\/storage\/v1\/object\/public\//.test(pathOrUrl)) return pathOrUrl;
  try {
    const u = new URL(pathOrUrl);
    if (u.pathname.includes("/storage/v1/object/") && !u.pathname.includes("/storage/v1/object/public/")) {
      u.pathname = u.pathname.replace("/storage/v1/object/", "/storage/v1/object/public/");
      return u.toString();
    }
  } catch {
    // none
  }
  return pathOrUrl;
}

function uniqNames(arr) {
  const seen = new Set();
  const out = [];
  for (const n of arr) {
    const k = String(n ?? "").trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(k); }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export default function RecipeModal({
  open,
  onOpenChange,
  initial,
  categories = [],
  saving = false,
  err = "",
  onSave,
}) {
  const empty = React.useRef({
    name: "",
    categories: [],
    image_url: "",
    imageFile: null,
    is_public: false,
    ingredients: [],
  });
  const [form, setForm] = React.useState(initial ?? empty.current);
  const [previewUrl, setPreviewUrl] = React.useState("");

  const [localCats, setLocalCats] = React.useState([]);
  const [showNewCat, setShowNewCat] = React.useState(false);
  const [newCat, setNewCat] = React.useState("");

  const [mode, setMode] = React.useState("Ingredients"); // Ingredients | Components

  const [ingQuery, setIngQuery] = React.useState("");
  const [ingOptions, setIngOptions] = React.useState([]);
  const [ingCats, setIngCats] = React.useState([]);
  const [selectedIngCats, setSelectedIngCats] = React.useState([]);
  const [ingLoading, setIngLoading] = React.useState(false);

  const [compQuery, setCompQuery] = React.useState("");
  const [compOptions, setCompOptions] = React.useState([]);
  const [compLoading, setCompLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const f = initial ? { ...initial } : { ...empty.current };
    setForm(f);
    setPreviewUrl(f.image_url ? toPublicUrlIfNeeded(f.image_url) : "");
    const server = (categories || []).map((c) => c.name);
    setLocalCats(uniqNames([...(f.categories || []), ...server, ...PRESET_CATS]));
    setNewCat("");
    setShowNewCat(false);

    setMode("Ingredients");
    setIngQuery("");
    setSelectedIngCats([]);
    setIngOptions([]);
    setCompQuery("");
    setCompOptions([]);
  }, [open, initial, categories]);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("ingredients_v1")
        .select("category")
        .not("category", "is", null)
        .limit(1000);
      if (error) return setIngCats([]);
      const set = new Set();
      for (const r of data || []) if (r.category) set.add(r.category);
      setIngCats(Array.from(set).sort().map((name) => ({ id: name, name })));
    })();
  }, [open]);

  const ingActive = ingQuery.trim().length >= 2 || selectedIngCats.length > 0;
  const compActive = compQuery.trim().length >= 1;

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

  const runComponentSearch = React.useCallback(async (q) => {
    if (!open) return;
    setCompLoading(true);
    try {
      let query = supabase
        .from("recipes_v1")
        .select("recipe_id,name,image_url")
        .contains("categories", ["Component"])
        .order("name", { ascending: true })
        .limit(50);
      if (q?.trim()?.length >= 1) query = query.ilike("name", `%${q.trim()}%`);
      const { data, error } = await query;
      setCompOptions(!error ? data || [] : []);
    } finally {
      setCompLoading(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (!ingActive) { setIngOptions([]); return; }
    const t = setTimeout(() => runIngredientSearch(ingQuery, selectedIngCats), 220);
    return () => clearTimeout(t);
  }, [open, ingActive, ingQuery, selectedIngCats, runIngredientSearch]);

  React.useEffect(() => {
    if (!open) return;
    if (!compActive) { setCompOptions([]); return; }
    const t = setTimeout(() => runComponentSearch(compQuery), 200);
    return () => clearTimeout(t);
  }, [open, compActive, compQuery, runComponentSearch]);

  function toggleCategory(name) {
    const n = String(name).trim();
    if (!n) return;
    setForm((f) => {
      const has = (f.categories || []).some((x) => x.toLowerCase() === n.toLowerCase());
      const next = has
        ? f.categories.filter((x) => x.toLowerCase() !== n.toLowerCase())
        : [...(f.categories || []), n];
      return { ...f, categories: uniqNames(next) };
    });
  }
  function addNewCategory() {
    const n = newCat.trim();
    if (!n) return;
    setLocalCats((lc) => uniqNames([...lc, n]));
    setForm((f) => ({ ...f, categories: uniqNames([...(f.categories || []), n]) }));
    setNewCat("");
    setShowNewCat(false);
  }

  function toggleIngCat(name) {
    setSelectedIngCats((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  }

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

  function addComponentRow(o) {
    if (!o) return;
    setForm((f) => {
      if (f.ingredients?.some((r) => r.type === "component" && r.component_id === o.recipe_id)) return f;
      return {
        ...f,
        ingredients: [
          ...(f.ingredients || []),
          { type: "component", component_id: o.recipe_id, name: o.name, unit: "serving", grams: 1 },
        ],
      };
    });
    setCompQuery("");
    setCompOptions([]);
  }

  function setRowGramsByKey(matchKey, grams) {
    const cleaned = String(grams).replace(/[^\d]/g, "");
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((r) => (matchKey(r) ? { ...r, grams: cleaned } : r)),
    }));
  }
  function removeRowByKey(matchKey) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((r) => !matchKey(r)) }));
  }

  function onImageFile(e) {
    const file = e.target.files?.[0] || null;
    setForm((f) => ({ ...f, imageFile: file }));
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  const canSave = (form.name || "").trim().length > 0 && !saving;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="980px" style={{ maxHeight: "85vh", overflow: "auto" }}>
        <Flex justify="between" align="center" mb="2">
          <Dialog.Title>{initial?.recipe_id ? "Edit recipe" : "Add recipe"}</Dialog.Title>
          <Flex gap="2" align="center">
            {err ? <Text color="red" mr="2">{err}</Text> : null}
            <Dialog.Close><Button variant="soft">Cancel</Button></Dialog.Close>
            <Button disabled={!canSave} onClick={() => onSave(form)}>{saving ? "Saving…" : "Save"}</Button>
          </Flex>
        </Flex>

        <style>{`
          .recipe-modal-grid { display: block; }
          @media (min-width: 900px) {
            .recipe-modal-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              align-items: start;
            }
          }
          .ing-grid { display:grid; grid-template-columns:1fr; gap:6px; }
          @media (min-width: 700px) { .ing-grid { grid-template-columns: 1fr 1fr; } }
        `}</style>

        <div className="recipe-modal-grid" style={{ marginTop: 8 }}>
          {/* LEFT */}
          <Card p="3">
            <Flex direction="column" gap="3">
              <div>
                <Text size="2">Name</Text>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ padding: 8, width: "100%" }} />
              </div>

              <div>
                <Text size="2">Add categories</Text>
                <Flex gap="2" wrap mt="1">
                  {localCats.map((name) => {
                    const active = form.categories?.some((x) => x.toLowerCase() === name.toLowerCase());
                    return (
                      <CategoryButton key={name} label={name} checked={!!active} onClick={() => toggleCategory(name)} />
                    );
                  })}
                </Flex>

                {!showNewCat ? (
                  <Button size="1" variant="soft" color="gray" onClick={() => setShowNewCat(true)} style={{ marginTop: 8 }}>
                    Add new…
                  </Button>
                ) : (
                  <Flex gap="2" align="center" mt="2">
                    <input
                      placeholder="New category"
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewCategory(); } }}
                      style={{ flex: 1, padding: 8 }}
                    />
                    <Button type="button" onClick={addNewCategory}>Add</Button>
                    <Button type="button" variant="soft" onClick={() => { setShowNewCat(false); setNewCat(""); }}>
                      Cancel
                    </Button>
                  </Flex>
                )}
              </div>

              <div>
                <Text size="2">Image</Text>
                <input type="file" accept="image/*" onChange={onImageFile} />
                <div style={{ marginTop: 8, width: "100%", minHeight: 160 }}>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      style={{ width: "100%", maxHeight: 160, borderRadius: 6, objectFit: "cover" }}
                      onError={(ev) => (ev.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <div style={{ width: "100%", height: 160, borderRadius: 6, background: "rgba(0,0,0,0.04)" }} />
                  )}
                </div>
              </div>
            </Flex>
          </Card>

          {/* RIGHT */}
          <Card p="3">
            <Flex direction="column" gap="3">
              <Flex align="center" justify="between">
                <Heading size="3">Add items</Heading>
                <SegmentedControl.Root value={mode} onValueChange={setMode}>
                  <SegmentedControl.Item value="Ingredients">Ingredients</SegmentedControl.Item>
                  <SegmentedControl.Item value="Components">Components</SegmentedControl.Item>
                </SegmentedControl.Root>
              </Flex>

              {mode === "Ingredients" && (
                <>
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

                  {ingActive && (
                    <div style={{ maxHeight: 140, overflowY: "auto", paddingRight: 4, marginBottom: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
                        {ingOptions.map((o) => (
                          <Card key={o.ingredient_id} size="1" style={{ padding: "6px 8px", lineHeight: 1.2 }}>
                            <Flex justify="between" align="center">
                              <Text>{o.name}</Text>
                              <Button size="1" onClick={() => addIngredientRow(o)}>Add</Button>
                            </Flex>
                          </Card>
                        ))}
                        {!ingOptions.length && <div style={{ gridColumn: "1 / -1", padding: 8 }}><Text color="gray">No matches.</Text></div>}
                      </div>
                    </div>
                  )}
                </>
              )}

              {mode === "Components" && (
                <>
                  <Flex gap="2" align="center">
                    <input
                      placeholder="Search components… (min 1 char)"
                      value={compQuery}
                      onChange={(e) => setCompQuery(e.target.value)}
                      style={{ flex: 1, padding: 8 }}
                    />
                    <Button size="2" onClick={() => { if (compActive) runComponentSearch(compQuery); }}>
                      {compLoading ? "Searching…" : "Search"}
                    </Button>
                  </Flex>

                  {compActive && (
                    <div style={{ maxHeight: 140, overflowY: "auto", paddingRight: 4, marginBottom: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
                        {compOptions.map((o) => (
                          <Card key={o.recipe_id} size="1" style={{ padding: "6px 8px", lineHeight: 1.2 }}>
                            <Flex justify="between" align="center">
                              <Text>{o.name}</Text>
                              <Button size="1" onClick={() => addComponentRow(o)}>Add</Button>
                            </Flex>
                          </Card>
                        ))}
                        {!compOptions.length && <div style={{ gridColumn: "1 / -1", padding: 8 }}><Text color="gray">No matches.</Text></div>}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div style={{ marginTop: 4 }}>
                <div className="ing-grid">
                  {(form.ingredients || []).map((r, idx) => {
                    const isComp = r.type === "component";
                    const keyMatch = (x) => isComp ? (x.type === "component" && x.component_id === r.component_id) : (x.ingredient_id === r.ingredient_id && !x.type);
                    return (
                      <Card key={`${isComp ? `c-${r.component_id}` : `i-${r.ingredient_id}`}-${idx}`} size="1" style={{ padding: "6px 8px" }}>
                        <Flex align="center" justify="between" gap="2">
                          <Text>{isComp ? `${r.name}` : r.name}</Text>
                          <Flex align="center" gap="2">
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="1"
                                value={r.grams}
                                onChange={(e) => setRowGramsByKey(keyMatch, e.target.value)}
                                style={{ width: 64, padding: 6, textAlign: "right" }}
                                aria-label={isComp ? "servings" : "grams"}
                              />
                              <Text>{isComp ? "serv" : "g"}</Text>
                            </div>
                            <Button
                              size="1"
                              variant="soft"
                              color="gray"
                              onClick={() => removeRowByKey(keyMatch)}
                              aria-label={`remove ${r.name}`}
                              style={{ padding: "0 8px" }}
                            >
                              ×
                            </Button>
                          </Flex>
                        </Flex>
                      </Card>
                    );
                  })}
                  {(form.ingredients || []).length === 0 && (
                    <Card size="1" style={{ gridColumn: "1 / -1", padding: 8 }}>
                      <Text color="gray">No items added yet.</Text>
                    </Card>
                  )}
                </div>
              </div>
            </Flex>
          </Card>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
