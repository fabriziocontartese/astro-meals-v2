// src/components/plan/edit/PlanRecipePicker.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Flex, Text, ScrollArea, SegmentedControl, Button } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient.js";
import { fetchRecipes, fetchCategories } from "../../../api/recipes.js";

/** Compact search + visibility bar embedded locally */
function InlineSearchBar({ search, onSearchChange, visibility, onVisibilityChange }) {
  return (
    <Flex gap="2" align="center" wrap="wrap">
      <input
        placeholder="Search name…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ flex: 1, minWidth: 140, padding: 8 }}
      />
      <Flex align="center" gap="2">
        <SegmentedControl.Root value={visibility} onValueChange={onVisibilityChange}>
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
          <SegmentedControl.Item value="private">Only mine</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>
    </Flex>
  );
}

/** PlanRecipePicker: embeds search bar + category filters like Recipes page */
export default function PlanRecipePicker({ selected, onSelect }) {
  const rootRef = useRef(null);

  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [visibility, setVisibility] = useState("all"); // "private" | "all"

  // load categories once
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      const cats = await fetchCategories(uid);
      if (mounted) setCategories(cats || []);
    })();
    return () => { mounted = false; };
  }, []);

  // load recipes whenever filters change
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      const recs = await fetchRecipes(uid, { search, categoryIds: selectedCats });
      if (!mounted) return;
      const createdById = uid || null;
      const pub = (recs || []).filter((r) => r.is_public === true);
      const mine = (recs || []).filter((r) => r?.author?.created_by === createdById && !r.is_public);
      const list = visibility === "private" ? mine : [...mine, ...pub];
      setRecipes(list);
      window.__recipes = list; // used by scheduler quick picker
    })();
    return () => { mounted = false; };
  }, [search, selectedCats, visibility]);

  // click outside to unselect
  useEffect(() => {
    const onDocClick = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) onSelect(null); };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [onSelect]);

  const filtered = useMemo(() => recipes, [recipes]);

  const toggleCategory = useCallback((name) => {
    setSelectedCats((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  }, []);

  return (
    <Card ref={rootRef} style={{ width: 260, flex: "0 0 260px" }}>
      <Flex direction="column" p="3" gap="3">
        <Text weight="bold">Recipes</Text>

        <InlineSearchBar
          search={search}
          onSearchChange={setSearch}
          visibility={visibility}
          onVisibilityChange={setVisibility}
        />

        {/* Category filters like Recipes page */}
        <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 96 }}>
        <Flex align="center" justify="between" mt="0">
          {selectedCats.length > 0}
        </Flex>
          <Flex gap="6px" wrap="wrap" pr="2">
            {categories.map((c) => {
              const checked = selectedCats.includes(c.name);
              return (
                <button
                  key={c.id}
                  onClick={(e) => { e.stopPropagation(); toggleCategory(c.name); }}
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
              <Text size="1" color="gray">No categories</Text>
            )}
          </Flex>
        </ScrollArea>

        <ScrollArea style={{ height: 420, marginTop: 6 }}>
          <Flex direction="column" gap="2">
            {filtered.map((r) => (
              <Card
                key={r.recipe_id}
                variant={selected?.recipe_id === r.recipe_id ? "solid" : "surface"}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(selected?.recipe_id === r.recipe_id ? null : r);
                }}
              >
                <Flex  gap="2" align="center">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.name}
                      onError={(ev) => (ev.currentTarget.style.display = "none")}
                      style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 6, display: "block" }}
                    />
                  ) : null}
                  <Text
                    size="2"
                    weight="bold"
                    style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    title={r.name}
                  >
                    {r.name}
                  </Text>
                </Flex>
              </Card>
            ))}
            {!filtered.length ? <Text size="2" color="gray">No recipes</Text> : null}
          </Flex>
        </ScrollArea>
      </Flex>
    </Card>
  );
}
