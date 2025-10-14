// src/components/plan/edit/PlanEditCalendar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Flex, Text, Dialog, ScrollArea } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient.js"

const WEEKDAY = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// layout tokens
const COL_W = 116;
const ROW_H = 74;
const MEAL_COL_W = 140;
const DOT = 10;

export default function PlanEditCalendar({ plan, onUpdate, selectedRecipe }) {
  const meals = plan?.meal_names || ["Breakfast", "Lunch", "Snack", "Dinner"];
  const lengthDays = Math.max(1, Number(plan?.length_days || 28));
  const weeksObj = (plan?.plan_recipes && plan.plan_recipes.weeks) || {};

  const viewportRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [vpW, setVpW] = useState(0);

  const [picker, setPicker] = useState({ open: false, meal: null, week0: 0, dayName: null });

  // rename state
  const [editingIdx, setEditingIdx] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameErr, setRenameErr] = useState("");

  const dayMeta = useMemo(
    () =>
      Array.from({ length: lengthDays }, (_, i) => {
        const dayIdx1 = i + 1;
        const week0 = Math.floor((dayIdx1 - 1) / 7);
        const dayName = WEEKDAY[(dayIdx1 - 1) % 7];
        return { dayIdx1, week0, dayName };
      }),
    [lengthDays]
  );

  const getItem = (week0, dayName, mealType) =>
    (weeksObj[week0]?.[dayName] || []).find((x) => x.type === mealType) || null;

  const assign = (week0, dayName, mealType, recipeOrNull) => {
    const curWeek = weeksObj[week0] || {};
    const kept = (curWeek[dayName] || []).filter((m) => m.type !== mealType);
    const next = recipeOrNull
      ? [...kept, { type: mealType, name: recipeOrNull.name, recipe_id: recipeOrNull.recipe_id, image_url: recipeOrNull.image_url || null }]
      : kept;
    const nextWeek = { ...curWeek, [dayName]: next };
    const nextWeeks = { ...weeksObj, [week0]: nextWeek };
    onUpdate?.({ ...plan, plan_recipes: { ...(plan.plan_recipes || {}), weeks: nextWeeks } });
  };

  const handleCellClick = (meal, week0, dayName) => {
    const existing = getItem(week0, dayName, meal);
    if (existing && !selectedRecipe) { assign(week0, dayName, meal, null); return; }
    if (selectedRecipe) { assign(week0, dayName, meal, selectedRecipe); return; }
    setPicker({ open: true, meal, week0, dayName });
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
    setEditingIdx(null);
    if (!newName || newName === oldName) { setDraftName(""); return; }

    const nextMealNames = meals.slice();
    nextMealNames[editingIdx] = newName;

    const migratedWeeks = {};
    for (const [wk, byDay] of Object.entries(weeksObj)) {
      const nextByDay = {};
      for (const [day, arr] of Object.entries(byDay || {})) {
        nextByDay[day] = (arr || []).map((m) => (m?.type === oldName ? { ...m, type: newName } : m));
      }
      migratedWeeks[wk] = nextByDay;
    }
    const nextPlan = { ...plan, meal_names: nextMealNames, plan_recipes: { ...(plan.plan_recipes || {}), weeks: migratedWeeks } };

    setRenameBusy(true);
    try {
      const { data, error } = await supabase
        .from("plans_v1")
        .update({ meal_names: nextMealNames, plan_recipes: nextPlan.plan_recipes })
        .eq("plan_id", plan.plan_id)
        .select("*")
        .single();
      if (error) throw error;
      onUpdate?.(data || nextPlan);
    } catch (e) {
      setRenameErr(e?.message || "Rename failed");
    } finally {
      setRenameBusy(false);
      setDraftName("");
    }
  };

  // scroll sync and size
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onScroll = () => setScrollLeft(vp.scrollLeft);
    const ro = new ResizeObserver(() => setVpW(vp.clientWidth));
    setVpW(vp.clientWidth);
    vp.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(vp);
    return () => { vp.removeEventListener("scroll", onScroll); ro.disconnect(); };
  }, []);

  const totalContentW = lengthDays * COL_W;
  const maxScroll = Math.max(1, totalContentW - vpW);
  const highlightLeftPx = (scrollLeft / maxScroll) * Math.max(0, vpW - (vpW * vpW) / totalContentW);
  const highlightW = totalContentW <= vpW ? vpW : (vpW / totalContentW) * vpW;

  const isDayComplete = (dayIdx1) => {
    const meta = dayMeta[dayIdx1 - 1];
    const placed = weeksObj[meta.week0]?.[meta.dayName] || [];
    return meals.every((m) => placed.some((x) => x.type === m));
  };

  return (
    <div style={{ padding: 8, background: "white" }}>
      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${MEAL_COL_W}px 1fr`,
          alignItems: "start",
          border: "1px solid var(--gray-5)",
          borderRadius: 12,
          overflow: "hidden",
          background: "white",
          boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
        }}
      >
        {/* sticky meal names */}
        <div>
          <div
            style={{
              width: MEAL_COL_W,
              height: 56,
              borderRight: "1px solid var(--gray-4)",
              borderBottom: "1px solid var(--gray-4)",
            //  background: "var(--gray-2)",
            }}
          />
          {meals.map((meal, idx) => (
            <div
              key={`ml-${meal}-${idx}`}
              style={{
                width: MEAL_COL_W,
                height: ROW_H,
                borderRight: "1px solid var(--gray-4)",
                borderBottom: "1px solid var(--gray-4)",
               // background: "var(--gray-2)",
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
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
                  // autosize to content length
                  size={Math.max(1, draftName.length)}
                  style={{
                    width: `${Math.max(1, draftName.length+3)}ch`,
                    minWidth: "2ch",
                    maxWidth: "100%",
                    padding: "6px 8px",
                    fontSize: 13,
                    border: "1px solid var(--gray-6)",
                    borderRadius: 8,
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
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--gray-12)",
                  }}
                >
                  {meal}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* scrollable day grid — hide native scrollbar */}
        <ScrollArea ref={viewportRef} type="auto" scrollbars="horizontal" >
          <div style={{ minWidth: totalContentW }}>
            {/* header */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${lengthDays}, ${COL_W}px)` }}>
              {dayMeta.map(({ dayIdx1, dayName }) => (
                <div
                  key={`hdr-${dayIdx1}`}
                  style={{
                    height: 56,
                    display: "grid",
                    placeItems: "center",
                    borderRight: "1px solid var(--gray-4)",
                    borderBottom: "1px solid var(--gray-4)",
                  //  background: "var(--gray-2)",
                  }}
                >
                  <div style={{ textAlign: "center", lineHeight: 1.15 }}>
                    <div style={{ fontSize: 11, color: "var(--gray-11)" }}>Day {dayIdx1}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{dayName}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* rows */}
            {meals.map((meal) => (
              <div
                key={`row-${meal}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${lengthDays}, ${COL_W}px)`,
                  background: "white",
                }}
              >
                {dayMeta.map(({ dayIdx1, week0, dayName }) => {
                  const item = getItem(week0, dayName, meal);
                  return (
                    <button
                      key={`cell-${meal}-${dayIdx1}`}
                      data-slot
                      onClick={() => handleCellClick(meal, week0, dayName)}
                      title={item ? item.name : "Set recipe"}
                      style={{
                        height: ROW_H,
                        borderRight: "1px solid var(--gray-4)",
                        borderBottom: "1px solid var(--gray-4)",
                        background: "var(--gray-1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        outline: selectedRecipe ? "2px solid var(--accent-7)" : "none",
                        padding: 0,
                      }}
                    >
                      {item ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: "92%", overflow: "hidden" }}>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt=""
                              onError={(ev) => (ev.currentTarget.style.display = "none")}
                              style={{ width: 42, height: 42, objectFit: "cover", borderRadius: 8, display: "block" }}
                            />
                          ) : null}
                        </div>
                      ) : (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            border: "1px solid var(--gray-6)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 18,
                            color: "var(--gray-10)",
                            background: "white",
                          }}
                        >
                          +
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* DOT SCROLL BAR — fills component width and mirrors viewport */}
      <div style={{ position: "relative", marginTop: 12 }}>
        <div style={{ width: vpW, marginLeft: MEAL_COL_W, position: "relative" }}>
          {/* rail of dots spans full width */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: lengthDays === 1 ? "center" : "space-between",
              alignItems: "center",
              padding: "4px 0",
            }}
          >
            {Array.from({ length: lengthDays }, (_, i) => i + 1).map((d) => {
              const complete = isDayComplete(d);
              return (
                <span
                  key={`dot-${d}`}
                  style={{
                    width: DOT,
                    height: DOT,
                    borderRadius: 999,
                    background: complete ? "var(--green-9)" : "var(--gray-6)",
                    flex: "0 0 auto",
                  }}
                />
              );
            })}
          </div>

          {/* highlight equal to visible part */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: highlightLeftPx,
              width: Math.max(DOT, highlightW),
              height: DOT + 8,
              borderRadius: 999,
              border: "2px solid var(--accent-9)",
              pointerEvents: "none",
              transition: "left 0ms linear, width 0ms linear",
            }}
          />
        </div>
      </div>

      {renameErr ? (
        <div style={{ marginTop: 6 }}>
          <Text size="2" color="red">{renameErr}</Text>
        </div>
      ) : null}

      {/* inline picker */}
      <Dialog.Root open={picker.open} onOpenChange={(o) => setPicker((p) => ({ ...p, open: o }))}>
        <Dialog.Content maxWidth="520px" aria-describedby={undefined}>
          <Dialog.Title>Select recipe</Dialog.Title>
          <MiniRecipeList
            onPick={(r) => {
              assign(picker.week0, picker.dayName, picker.meal, r);
              setPicker({ open: false, meal: null, week0: 0, dayName: null });
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
