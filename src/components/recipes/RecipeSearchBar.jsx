import React from "react";
import { Flex, Text, Button, Checkbox } from "@radix-ui/themes";

export default function RecipeSearchBar({
  search,
  onSearchChange,
  categories,
  selectedCats,
  onToggleCategory,
  onClear,
  onSubmit,
}) {
  const handleSubmit = (e) => { e.preventDefault(); onSubmit && onSubmit(); };

  return (
    <form onSubmit={handleSubmit}>
      <Flex gap="3" align="center">
        <input
          placeholder="Search name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <Button type="button" onClick={onClear}>Clear</Button>
        <Button type="submit">Apply</Button>
      </Flex>

      <div style={{ marginTop: 8 }}>
        <Text size="2" color="gray">Recipe filters</Text>
        <Flex gap="3" wrap style={{ marginTop: 6 }}>
          {categories.map((c) => {
            const checked = selectedCats.includes(c.name);
            return (
              <label key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggleCategory(c.name)}
                />
                <Text>{c.name}</Text>
              </label>
            );
          })}
        </Flex>
      </div>
    </form>
  );
}
