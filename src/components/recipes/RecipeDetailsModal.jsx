// src/components/recipes/RecipeDetailsModal.jsx
// High-level: Read-only recipe viewer. Expands component recipes into base ingredients and lists everything.

import React from "react";
import { Dialog, Button, Flex, Text, Card, Heading, Separator } from "@radix-ui/themes";
import { supabase } from "../../auth/supabaseClient.js";

// Placeholder for missing/broken images.
const PLACEHOLDER = "/storage/v1/object/public/placeholder/placeholder";

// Converts storage keys and non-public URLs into public URLs for display.
function toPublicUrlIfNeeded(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  try {
    const u = new URL(pathOrUrl, window.location.origin);
    if (u.pathname.includes("/storage/v1/object/") && !u.pathname.includes("/storage/v1/object/public/")) {
      u.pathname = u.pathname.replace("/storage/v1/object/", "/storage/v1/object/public/");
      return u.toString();
    }
  } catch {
    // none
  }
  return pathOrUrl;
}

export default function RecipeDetailsModal({
  open,            // modal open flag
  onOpenChange,    // modal state handler
  recipe,          // recipe object to display
  canEdit = false, // enables Edit/Delete actions
  onEdit,          // edit handler
  onDelete,        // delete handler
}) {
  // Loaded component recipes that this recipe embeds.
  const [componentDetails, setComponentDetails] = React.useState([]);

  // Categories and raw items from the recipe.
  const cats = Array.isArray(recipe?.categories) ? recipe.categories : [];
  const items = React.useMemo(
    () => (Array.isArray(recipe?.ingredients) ? recipe.ingredients : []),
    [recipe?.ingredients]
  );

  // Derived splits: component rows vs base ingredient rows.
  const comps = React.useMemo(() => items.filter((r) => r?.component_id), [items]); // embedded components
  const basics = React.useMemo(
    () => items.filter((r) => !r?.component_id && r?.ingredient_id),            // base ingredients
    [items]
  );

  // Fetch full details for embedded component recipes when modal opens.
  React.useEffect(() => {
    if (!open || comps.length === 0) {
      setComponentDetails([]);
      return;
    }
    (async () => {
      const ids = comps.map((c) => c.component_id).filter(Boolean);
      if (!ids.length) { setComponentDetails([]); return; }
      const { data, error } = await supabase
        .from("recipes_v1")
        .select("recipe_id,name,image_url,ingredients")
        .in("recipe_id", ids);
      setComponentDetails(!error ? (data || []) : []);
    })();
  }, [open, recipe?.recipe_id, comps]);

  // Flattens each component's ingredients into base ingredients, scaled by quantity/servings.
  const flatComponentIngredients = React.useMemo(() => {
    if (!componentDetails?.length) return [];
    return componentDetails.flatMap((c) => {
      const parentRow = comps.find((x) => x.component_id === c.recipe_id) || {};
      const qty = Number(parentRow.qty ?? parentRow.servings ?? parentRow.grams ?? 1);
      const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
      const ingr = Array.isArray(c.ingredients) ? c.ingredients : [];
      return ingr.map((i) => ({
        _key: `${c.recipe_id}:${i.ingredient_id || i.name}`,
        ingredient_id: i.ingredient_id,
        name: i.name,
        unit: i.unit || "g",
        grams: Number(i.grams || 0) * safeQty,
        note: `from ${c.name}`,
      }));
    });
  }, [componentDetails, comps]);

  // Combined list: base ingredients + expanded component ingredients.
  const allIngredients = React.useMemo(
    () => [
      ...basics.map((r) => ({
        _key: `base:${r.ingredient_id || ""}:${r.name}`,
        ingredient_id: r.ingredient_id,
        name: r.name,
        unit: r.unit || "g",
        grams: Number(r.grams || 0),
        note: r.note || "",
      })),
      ...flatComponentIngredients,
    ],
    [basics, flatComponentIngredients]
  );

  if (!recipe) return null;

  // Main image with public URL fallback.
  const mainImage = toPublicUrlIfNeeded(recipe.image_url) || PLACEHOLDER;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="760px">
        {/* Accessibility: title and short description */}
        <Dialog.Title>{recipe.name || "Recipe details"}</Dialog.Title>
        <Dialog.Description>Ingredients, components, and metadata</Dialog.Description>

        <Card mt="3" p="3">
          <Flex direction="column" gap="3">
            {/* Header */}
            <Heading size="4" style={{ margin: 0 }}>{recipe.name}</Heading>

            {/* Image */}
            {mainImage ? (
              <img
                src={mainImage}
                alt={recipe.name}
                style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 8 }}
                onError={(ev) => (ev.currentTarget.src = PLACEHOLDER)}
              />
            ) : null}

            {/* Categories */}
            {cats.length ? (
              <div>
                <Text size="2" color="gray">Categories</Text>
                <div style={{ marginTop: 6 }}>{cats.join(" • ")}</div>
              </div>
            ) : null}

            <Separator my="2" />

            {/* Flat ingredient table */}
            <div>
              <Heading size="3" mb="1">All ingredients</Heading>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {allIngredients.length ? (
                      allIngredients.map((r) => (
                        <tr key={r._key}>
                          <td style={{ padding: 6 }}>
                            <Text>{r.name}</Text>{" "}
                            <Text size="1" color="gray">({r.unit || "g"})</Text>
                          </td>
                          <td style={{ padding: 6, textAlign: "right" }}>{Number(r.grams || 0)}</td>
                          <td style={{ padding: 6 }}>
                            <Text size="1" color="gray">{r.note || ""}</Text>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ padding: 8 }}>
                          <Text color="gray">No ingredients.</Text>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Separator my="3" />

              {/* Cards for each included component recipe */}
              {componentDetails.length > 0 && (
                <div>
                  <Heading size="3" mb="1">Included components</Heading>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                      gap: 8,
                    }}
                  >
                    {componentDetails.map((c) => {
                      const parentRow = comps.find((x) => x.component_id === c.recipe_id) || {};
                      const qty = Number(parentRow.qty ?? parentRow.servings ?? parentRow.grams ?? 1);
                      return (
                        <Card key={c.recipe_id} size="2">
                          <Flex direction="column" gap="2">
                            <Heading size="3" style={{ marginTop: 0 }}>{c.name}</Heading>
                            <Text size="1" color="gray">Quantity: {Number.isFinite(qty) && qty > 0 ? qty : 1}</Text>
                            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                              {(Array.isArray(c.ingredients) ? c.ingredients : []).map((i) => (
                                <li key={i.ingredient_id || i.name}>
                                  <Text size="2">{i.name}</Text>{" "}
                                  <Text size="1" color="gray">({Number(i.grams || 0)} g)</Text>
                                </li>
                              ))}
                              {(!c.ingredients || c.ingredients.length === 0) && (
                                <Text size="2" color="gray">No items.</Text>
                              )}
                            </ul>
                          </Flex>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions: visibility + edit/delete + close */}
            <Flex gap="2" mt="2" justify="between" align="center">
              <Text size="2" color="gray">{recipe.is_public ? "Public" : "Private"}</Text>
              <Flex gap="2">
                {canEdit && <Button variant="soft" color="red" onClick={onDelete}>Delete</Button>}
                {canEdit && <Button variant="soft" onClick={onEdit}>Edit</Button>}
                <Dialog.Close><Button>Close</Button></Dialog.Close>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      </Dialog.Content>
    </Dialog.Root>
  );
}
