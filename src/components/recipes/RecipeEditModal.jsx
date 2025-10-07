import React from "react";
import { Dialog, Button, Flex, Text, Card, Heading, Separator } from "@radix-ui/themes";
import { supabase } from "../../auth/supabaseClient.js";

const STORAGE_BUCKET = "recipe-images";

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
    // Ignore URL parsing errors and return original path
  }
  return pathOrUrl;
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

  React.useEffect(() => {
    if (!open) return;
    const f = initial ? { ...initial } : { ...empty.current };
    setForm(f);
    setPreviewUrl(f.image_url ? toPublicUrlIfNeeded(f.image_url) : "");
  }, [open, initial]);

  // ingredient search + filters
  const [ingQuery, setIngQuery] = React.useState("");
  const [ingOptions, setIngOptions] = React.useState([]);
  const [ingCats, setIngCats] = React.useState([]);
  const [selectedIngCats, setSelectedIngCats] = React.useState([]);
  const [ingLoading, setIngLoading] = React.useState(false);

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
    const t = setTimeout(() => runIngredientSearch(ingQuery, selectedIngCats), 220);
    return () => clearTimeout(t);
  }, [ingQuery, selectedIngCats, runIngredientSearch]);

  function toggleIngCat(name) {
    setSelectedIngCats((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  }

  function addIngredientRow(o) {
    if (!o) return;
    setForm((f) => {
      if (f.ingredients?.some((r) => r.ingredient_id === o.ingredient_id)) return f;
      return { ...f, ingredients: [...(f.ingredients || []), { ingredient_id: o.ingredient_id, name: o.name, unit: o.unit || "g", grams: 0, note: "" }] };
    });
  }
  function setRowGrams(id, grams) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.map((r) => (r.ingredient_id === id ? { ...r, grams } : r)) }));
  }
  function setRowNote(id, note) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.map((r) => (r.ingredient_id === id ? { ...r, note } : r)) }));
  }
  function removeRow(id) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((r) => r.ingredient_id !== id) }));
  }

  function onImageFile(e) {
    const file = e.target.files?.[0] || null;
    setForm((f) => ({ ...f, imageFile: file }));
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  const canSave = (form.name || "").trim().length > 0 && !saving;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="860px">
        <Dialog.Title>{initial?.recipe_id ? "Edit recipe" : "Add recipe"}</Dialog.Title>
        <Dialog.Description>Fill the fields and add ingredients.</Dialog.Description>

        <Card mt="3" p="3">
          <Flex direction="column" gap="3">
            <div>
              <Text size="2">Name</Text>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ padding: 8, width: "100%" }} />
            </div>

            <div>
              <Text size="2">Recipe categories</Text>
              <Flex gap="2" wrap mt="1">
                {categories.map((c) => (
                  <Button
                    key={c.id}
                    size="2"
                    variant={form.categories?.includes(c.name) ? "solid" : "soft"}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        categories: f.categories?.includes(c.name) ? f.categories.filter((x) => x !== c.name) : [...(f.categories || []), c.name],
                      }))
                    }
                  >
                    {c.name}
                  </Button>
                ))}
              </Flex>
            </div>

            <div>
              <Text size="2">Image</Text>
              <input type="file" accept="image/*" onChange={onImageFile} />
              {previewUrl ? (
                <div style={{ marginTop: 8 }}>
                  <img src={previewUrl} alt="" style={{ height: 120, borderRadius: 6, objectFit: "cover" }} onError={(ev) => (ev.currentTarget.style.display = "none")} />
                </div>
              ) : null}
            </div>

            <Separator my="2" />

            <div>
              <Heading size="3" mb="1">Ingredients</Heading>
              <Text size="2" color="gray">Search and filter by ingredient category. Click “Add”.</Text>

              <Flex gap="2" wrap mt="2">
                {ingCats.map((c) => (
                  <Button key={c.id} size="1" variant={selectedIngCats.includes(c.name) ? "solid" : "soft"} onClick={() => toggleIngCat(c.name)}>
                    {c.name}
                  </Button>
                ))}
                {!!ingCats.length && <Button size="1" variant="soft" onClick={() => setSelectedIngCats([])}>Clear filters</Button>}
              </Flex>

              <Flex gap="2" align="center" style={{ marginTop: 8, marginBottom: 8 }}>
                <input placeholder="Search ingredients… (min 2 chars or use filters)" value={ingQuery} onChange={(e) => setIngQuery(e.target.value)} style={{ flex: 1, padding: 8 }} />
                <Button size="2" onClick={() => runIngredientSearch(ingQuery, selectedIngCats)}>{ingLoading ? "Searching…" : "Search"}</Button>
              </Flex>

              {ingOptions.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 8, marginBottom: 8 }}>
                  {ingOptions.map((o) => (
                    <Card key={o.ingredient_id} size="2">
                      <Flex justify="between" align="center">
                        <div>
                          <Text>{o.name}</Text>
                          {o.category ? <div style={{ fontSize: 11, color: "#666" }}>{o.category}</div> : null}
                        </div>
                        <Button size="1" onClick={() => addIngredientRow(o)}>Add</Button>
                      </Flex>
                    </Card>
                  ))}
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: 6 }}>Ingredient</th>
                      <th style={{ textAlign: "right", padding: 6, width: 140 }}>Grams</th>
                      <th style={{ textAlign: "left", padding: 6, width: 220 }}>Note</th>
                      <th style={{ padding: 6, width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.ingredients || []).map((r) => (
                      <tr key={r.ingredient_id}>
                        <td style={{ padding: 6 }}>
                          <Text>{r.name}</Text> <Text size="1" color="gray">({r.unit || "g"})</Text>
                        </td>
                        <td style={{ padding: 6, textAlign: "right" }}>
                          <input type="number" min="0" step="1" value={r.grams} onChange={(e) => setRowGrams(r.ingredient_id, e.target.value)} style={{ width: 120, padding: 6, textAlign: "right" }} />
                        </td>
                        <td style={{ padding: 6 }}>
                          <input value={r.note || ""} onChange={(e) => setRowNote(r.ingredient_id, e.target.value)} style={{ width: "100%", padding: 6 }} placeholder="optional" />
                        </td>
                        <td style={{ padding: 6, textAlign: "center" }}>
                          <Button size="1" variant="soft" onClick={() => removeRow(r.ingredient_id)}>Remove</Button>
                        </td>
                      </tr>
                    ))}
                    {(form.ingredients || []).length === 0 && (
                      <tr><td colSpan={4} style={{ padding: 8 }}><Text color="gray">No ingredients added yet.</Text></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {err ? <Text color="red">{err}</Text> : null}

            <Flex gap="2" mt="2">
              <Button disabled={!canSave} onClick={() => onSave(form)}>{saving ? "Saving…" : "Save"}</Button>
              <Dialog.Close><Button variant="soft">Cancel</Button></Dialog.Close>
            </Flex>
          </Flex>
        </Card>
      </Dialog.Content>
    </Dialog.Root>
  );
}
