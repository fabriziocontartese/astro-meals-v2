import React from "react";
import { Dialog, Button, Flex, Text, Card, Heading, Separator } from "@radix-ui/themes";

export default function RecipeDetailsModal({
  open,
  onOpenChange,
  recipe,
  canEdit = false,
  onEdit,
  onDelete,
}) {
  if (!recipe) return null;
  const cats = Array.isArray(recipe.categories) ? recipe.categories : [];
  const items = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="760px">

        <Card mt="3" p="3">
          <Flex direction="column" gap="3">
            <Heading size="4" style={{ margin: 0 }}>{recipe.name}</Heading>

            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.name}
                style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 8 }}
                onError={(ev) => (ev.currentTarget.style.display = "none")}
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
              <Heading size="3" mb="1">Ingredients</Heading>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.ingredient_id}>
                        <td style={{ padding: 6 }}>
                          <Text>{r.name}</Text>{" "}
                          <Text size="1" color="gray">({r.unit || "g"})</Text>
                        </td>
                        <td style={{ padding: 6, textAlign: "right" }}>{Number(r.grams || 0)}</td>
                        <td style={{ padding: 6 }}>{r.note || ""}</td>
                      </tr>
                    ))}
                    {!items.length && (
                      <tr><td colSpan={3} style={{ padding: 8 }}><Text color="gray">No ingredients listed.</Text></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Flex gap="2" mt="2" justify="between" align="center">
              <Text size="2" color="gray">{recipe.is_public ? "Public" : "Private"}</Text>
              <Flex gap="2">
                {canEdit && <Button variant="soft" onClick={onEdit}>Edit</Button>}
                {canEdit && <Button variant="soft" color="red" onClick={onDelete}>Delete</Button>}
                <Dialog.Close><Button>Close</Button></Dialog.Close>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      </Dialog.Content>
    </Dialog.Root>
  );
}
