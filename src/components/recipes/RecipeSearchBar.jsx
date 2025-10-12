// src/components/recipes/RecipeSearchBar.jsx
import React from "react";
import { Flex, SegmentedControl, Text } from "@radix-ui/themes";

export default function RecipeSearchBar({
  search,
  onSearchChange,
  visibility,
  onVisibilityChange,
}) {
  return (
    <Flex gap="2" align="center" wrap="wrap">
      <input
        placeholder="Search name…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ flex: 1, minWidth: 140, padding: 8 }}
      />
      <Flex align="center" gap="2">
        <Text size="2" color="gray">Show</Text>
        <SegmentedControl.Root value={visibility} onValueChange={onVisibilityChange}>
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
          <SegmentedControl.Item value="private">Only mine</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>
    </Flex>
  );
}
