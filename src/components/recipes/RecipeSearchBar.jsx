// src/components/recipes/RecipeSearchBar.jsx
import React from "react";
import { Flex, ScrollArea, Text } from "@radix-ui/themes";

export default function RecipeSearchBar({
  search,
  onSearchChange,
  categories = [],
  selectedCats = [],
  onToggleCategory,
}) {
  return (
    <Flex direction="column" gap="2">
      {/* search bar */}
      <Flex gap="2" align="center" wrap="wrap">
        <input
          placeholder="Search name…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            flex: 1,
            minWidth: 140,
            padding: 8,
            borderRadius: 8,
            border: "1px solid var(--gray-6)",
          }}
        />
      </Flex>

      {/* category filters below search */}
      <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 96 }}>
        <Flex gap="6px" wrap="wrap" pr="2">
          {categories.map((c) => {
            const checked = selectedCats.includes(c.name);
            return (
              <button
                key={c.id || c.name}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCategory?.(c.name);
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid var(--gray-6)",
                  background: checked ? "var(--accent-5)" : "var(--color-panel)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
                aria-pressed={checked}
              >
                {c.name}
              </button>
            );
          })}
          {!categories.length && (
            <Text size="1" color="gray">
              No categories
            </Text>
          )}
        </Flex>
      </ScrollArea>
    </Flex>
  );
}
