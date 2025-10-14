// src/components/recipes/RecipeDetailsModal.jsx

import React from "react";
import { Dialog, Button, Flex, Text, Card, Heading, Separator } from "@radix-ui/themes";
import { supabase } from "../../auth/supabaseClient.js";

const PLACEHOLDER = "/storage/v1/object/public/placeholder/placeholder";

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
  open,
  onOpenChange,
  recipe,
  canEdit = false,
  onEdit,
  onDelete,
}) {
  const [componentDetails, setComponentDetails] = React.useState([]);

  const cats = Array.isArray(recipe?.categories) ? recipe.categories : [];
  const items = React.useMemo(
    () => (Array.isArray(recipe?.ingredients) ? recipe.ingredients : []),
    [recipe?.ingredients]
  );

  // rows with component_id are embedded components
  const comps = React.useMemo(() => items.filter((r) => r?.component_id), [items]);

  // base ingredients have ingredient_id and no component_id
  const basics = React.useMemo(
    () => items.filter((r) => !r?.component_id && r?.ingredient_id),
    [items]
  );

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

  const mainImage = toPublicUrlIfNeeded(recipe.image_url) || PLACEHOLDER;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="760px">
        {/* Accessibility: provide required Title and Description */}
        <Dialog.Title>{recipe.name || "Recipe details"}</Dialog.Title>
        <Dialog.Description>Ingredients, components, and metadata</Dialog.Description>

        <Card mt="3" p="3">
          <Flex direction="column" gap="3">
            <Heading size="4" style={{ margin: 0 }}>{recipe.name}</Heading>

            {mainImage ? (
              <img
                src={mainImage}
                alt={recipe.name}
                style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 8 }}
                onError={(ev) => (ev.currentTarget.src = PLACEHOLDER)}
              />
            ) : null}

            {cats.length ? (
              <div>
                <Text size="2" color="gray">Categories</Text>
                <div style={{ marginTop: 6 }}>{cats.join(" • ")}</div>
              </div>
            ) : null}

            <Separator my="2" />

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
