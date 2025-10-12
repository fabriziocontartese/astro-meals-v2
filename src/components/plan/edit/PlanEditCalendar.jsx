// src/components/plan/edit/PlanEditCalendar.jsx
import React, { useMemo, useState } from "react";
import { Flex, Button, Text, Dialog, ScrollArea } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient";

const dayNames = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function PlanEditCalendar({ plan, onUpdate, selectedRecipe }) {
  const meals = plan?.meal_names || ["Breakfast", "Lunch", "Snack", "Dinner"];
  const totalWeeks = Math.max(1, Math.ceil((plan?.length_days || 28) / 7));
  const weeksObj = (plan?.plan_recipes && plan.plan_recipes.weeks) || {};
  const [week, setWeek] = useState(1);
  const [picker, setPicker] = useState({ open: false, meal: null, day: null });

  // inline rename state
  const [editingIdx, setEditingIdx] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameErr, setRenameErr] = useState("");

  const markers = useMemo(() => Array.from({ length: totalWeeks }, (_, i) => i + 1), [totalWeeks]);

  const getItem = (w, day, mealType) =>
    (weeksObj[w - 1]?.[day] || []).find((x) => x.type === mealType) || null;

  const assign = (w, day, mealType, recipeOrNull) => {
    const curWeek = weeksObj[w - 1] || {};
    const kept = (curWeek[day] || []).filter((m) => m.type !== mealType);
    const next = recipeOrNull
      ? [...kept, { type: mealType, name: recipeOrNull.name, recipe_id: recipeOrNull.recipe_id, image_url: recipeOrNull.image_url || null }]
      : kept;
    const nextWeek = { ...curWeek, [day]: next };
    const nextWeeks = { ...weeksObj, [w - 1]: nextWeek };
    onUpdate?.({ ...plan, plan_recipes: { ...(plan.plan_recipes || {}), weeks: nextWeeks } });
  };

  const handleCellClick = (meal, day) => {
    const existing = getItem(week, day, meal);
    if (existing && !selectedRecipe) {
      assign(week, day, meal, null);
      return;
    }
    if (selectedRecipe) {
      assign(week, day, meal, selectedRecipe);
      return;
    }
    setPicker({ open: true, meal, day });
  };

  // rename helpers
  const beginRename = (idx) => {
    setRenameErr("");
    setEditingIdx(idx);
    setDraftName(meals[idx] || "");
  };

  const commitRename = async () => {
    if (editingIdx == null) return;
    const oldName = meals[editingIdx];
    const newName = (draftName || "").trim();
    if (!newName || newName === oldName) {
      setEditingIdx(null);
      setDraftName("");
      return;
    }

    // Update meal_names array
    const nextMealNames = meals.slice();
    nextMealNames[editingIdx] = newName;

    // Migrate existing placed items: change .type oldName -> newName
    const migratedWeeks = {};
    for (const [wk, byDay] of Object.entries(weeksObj)) {
      const nextByDay = {};
      for (const [day, arr] of Object.entries(byDay || {})) {
        const nextArr = (arr || []).map((m) =>
          m?.type === oldName ? { ...m, type: newName } : m
        );
        nextByDay[day] = nextArr;
      }
      migratedWeeks[wk] = nextByDay;
    }

    const nextPlan = {
      ...plan,
      meal_names: nextMealNames,
      plan_recipes: { ...(plan.plan_recipes || {}), weeks: migratedWeeks },
    };

    setRenameBusy(true);
    setRenameErr("");
    try {
      const { data, error } = await supabase
        .from("plans_v1")
        .update({
          meal_names: nextMealNames,
          plan_recipes: nextPlan.plan_recipes,
        })
        .eq("plan_id", plan.plan_id)
        .select("*")
        .single();
      if (error) throw error;
      onUpdate?.(data || nextPlan);
      setEditingIdx(null);
      setDraftName("");
    } catch (e) {
      setRenameErr(e?.message || "Rename failed");
    } finally {
      setRenameBusy(false);
    }
  };

  return (
    <div style={{ padding: 8 }}>
      {/* header */}
      <Flex align="center" justify="between" mb="2" gap="2" wrap="wrap">
        <Text weight="bold" size="4">Schedule</Text>
        <Flex align="center" gap="2">
          <Button variant="soft" size="1" onClick={() => setWeek((w) => Math.max(1, w - 1))}>←</Button>
          <Text size="2">Week {week}/{totalWeeks}</Text>
          <Button variant="soft" size="1" onClick={() => setWeek((w) => Math.min(totalWeeks, w + 1))}>→</Button>
        </Flex>
      </Flex>

      {/* grid */}
      <ScrollArea type="auto" scrollbars="horizontal">
        <div style={{ minWidth: 620 }}>
          <Flex direction="column" gap="10px">
            {/* day names */}
            <Flex gap="8px" align="center">
              <div style={{ width: 120 }} />
              {dayNames.map((d) => (
                <div
                  key={d}
                  style={{ flex: "1 1 0", minWidth: 86, textAlign: "center", fontWeight: 600, fontSize: 13 }}
                >
                  {d}
                </div>
              ))}
            </Flex>

            {/* rows */}
            {meals.map((meal, idx) => (
              <Flex key={`${meal}-${idx}`} gap="8px" align="center">
                {/* meal label with inline rename */}
                <div
                  style={{
                    width: 120,
                    padding: "4px 6px",
                    borderRadius: 8,
                    background: "var(--gray-3)",
                    border: "1px solid var(--gray-5)",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {editingIdx === idx ? (
                    <input
                      autoFocus
                      disabled={renameBusy}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") { setEditingIdx(null); setDraftName(""); }
                      }}
                      style={{
                        flex: 1,
                        padding: "4px 6px",
                        fontSize: 12,
                        border: "1px solid var(--gray-6)",
                        borderRadius: 6,
                        background: "white",
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => beginRename(idx)}
                      title="Click to rename meal"
                      style={{
                        flex: 1,
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: "text",
                        fontSize: 12,
                      }}
                    >
                      {meal}
                    </button>
                  )}
                </div>

                {/* cells */}
                {dayNames.map((day) => {
                  const item = getItem(week, day, meal);
                  return (
                    <button
                      key={day}
                      onClick={() => handleCellClick(meal, day)}
                      title={item ? item.name : "Set recipe"}
                      style={{
                        flex: "1 1 0",
                        minWidth: 86,
                        height: 56,
                        borderRadius: 10,
                        border: item ? "1px solid var(--gray-6)" : "1px solid var(--gray-5)",
                        background: "var(--gray-2)",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        outline: selectedRecipe ? "2px solid var(--accent-7)" : "none",
                        transition: "transform 120ms ease",
                      }}
                    >
                      {item ? (
                        <img
                          src={item.image_url || ""}
                          alt=""
                          onError={(ev) => (ev.currentTarget.style.display = "none")}
                          style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, display: "block" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: "1px solid var(--gray-6)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 16,
                            color: "var(--gray-10)",
                          }}
                        >
                          +
                        </div>
                      )}
                    </button>
                  );
                })}
              </Flex>
            ))}
          </Flex>
        </div>
      </ScrollArea>

      {/* error inline */}
      {renameErr ? (
        <div style={{ marginTop: 6 }}>
          <Text size="2" color="red">{renameErr}</Text>
        </div>
      ) : null}

      {/* simple week dots */}
      <Flex justify="center" mt="10px" gap="6px">
        {markers.map((i) => (
          <div
            key={i}
            onClick={() => setWeek(i)}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: i === week ? "var(--accent-9)" : "var(--gray-6)",
              cursor: "pointer",
            }}
          />
        ))}
      </Flex>

      {/* inline picker (uses window.__recipes populated by RecipePicker) */}
      <Dialog.Root open={picker.open} onOpenChange={(o) => setPicker((p) => ({ ...p, open: o }))}>
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>Select recipe</Dialog.Title>
          <MiniRecipeList
            onPick={(r) => {
              assign(week, picker.day, picker.meal, r);
              setPicker({ open: false, meal: null, day: null });
            }}
          />
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}

function MiniRecipeList({ onPick }) {
  const list = Array.isArray(window.__recipes) ? window.__recipes : [];
  return (
    <ScrollArea style={{ height: 320 }}>
      <Flex direction="column" gap="6px">
        {list.map((r) => (
          <button
            key={r.recipe_id}
            onClick={() => onPick(r)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 8,
              borderRadius: 10,
              border: "1px solid var(--gray-5)",
              background: "var(--color-panel)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {r.image_url ? (
              <img
                src={r.image_url}
                alt=""
                onError={(ev) => (ev.currentTarget.style.display = "none")}
                style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8, display: "block" }}
              />
            ) : null}
            <Text size="2" weight="bold" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.name}
            </Text>
          </button>
        ))}
        {!list.length ? <Text size="2" color="gray" px="1">No recipes</Text> : null}
      </Flex>
    </ScrollArea>
  );
}
