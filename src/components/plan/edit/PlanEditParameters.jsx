// src/components/plan/edit/PlanEditParameters.jsx
// High-level: Edit plan metadata (name, length, start date, meals/day). Auto-loop start date forward. Persists updates and rebuilds a flat schedule from weekly data.

import React, { useEffect, useRef, useState } from "react";
import { Card, Flex, Button, TextField, Text } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient.js";

const dayNames = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// ---- date helpers (local, no TZ drift)
const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseYMD = (s) => {
  if (!s) return new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
};
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const diffDays = (a, b) => {
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((b0 - a0) / 86400000);
};

// Build flat day-by-day schedule from weekly structure to simplify reads.
function buildFlatSchedule(plan) {
  const length = Number(plan?.length_days || 0);
  const meals = plan?.meal_names || ["Breakfast","Lunch","Snack","Dinner"];
  const weeks = plan?.plan_recipes?.weeks || {};
  const days = {};
  for (let i = 0; i < length; i++) {
    const w = Math.floor(i / 7);
    const dayName = dayNames[i % 7];
    const assigned = weeks[w]?.[dayName] || [];
    const dayObj = {};
    meals.forEach((m, idx) => {
      const hit = assigned.find((x) => x.type === m) || null;
      dayObj[String(idx + 1)] = hit
        ? { recipe_id: hit.recipe_id, name: hit.name, image_url: hit.image_url || null }
        : null;
    });
    days[String(i + 1)] = dayObj;
  }
  return { days, meals, length_days: length };
}

export default function PlanEditParameters({ plan, onUpdate, onSave, fullWidth=false }) {
  // UI state seeded from plan
  const [name, setName] = useState(plan?.name ?? "");
  const [lengthDays, setLengthDays] = useState(String(plan?.length_days ?? 42));
  const [mealsPerDay, setMealsPerDay] = useState(String(plan?.meals_per_day ?? 4));
  const [startDate, setStartDate] = useState(plan?.objective?.start_date ?? toISO(new Date()));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // --- AUTO-LOOP: if plan ended before today, roll start_date forward by whole cycles
  const loopedOnce = useRef(false);
  useEffect(() => {
    if (loopedOnce.current) return;
    const lenInt = parseInt(lengthDays, 10);
    if (!Number.isInteger(lenInt) || lenInt < 1) return;

    const start = parseYMD(plan?.objective?.start_date || startDate);
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const daysSinceStart = diffDays(start, today); // 0-based
    if (daysSinceStart < lenInt) return;

    const cycles = Math.floor(daysSinceStart / lenInt);
    const newStart = addDays(start, cycles * lenInt); // moves to the day after the last finished cycle
    const iso = toISO(newStart);

    // update local state immediately
    setStartDate(iso);
    loopedOnce.current = true;

    // persist minimal patch
    (async () => {
      try {
        const nextObjective = { ...(plan?.objective || {}), start_date: iso };
        const { data, error } = await supabase
          .from("plans_v1")
          .update({ objective: nextObjective })
          .eq("plan_id", plan.plan_id)
          .select("*")
          .single();
        if (error) throw error;
        onUpdate?.(data || { ...plan, objective: nextObjective });
      } catch (e) {
        setErr(e.message || "Auto-loop update failed");
      }
    })();
  }, [plan?.objective?.start_date, lengthDays, onUpdate, plan, startDate]); // runs on mount and when inputs change

  // inputs
  const onChangeName = (e) => setName(e.target.value.slice(0, 25));
  const clampOnChange = (value, max) => {
    if (value === "") return "";
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n)) return value;
    if (n > max) return String(max);
    return String(n);
  };
  const onChangeDays = (e) => setLengthDays(clampOnChange(e.target.value, 90));
  const onChangeMeals = (e) => setMealsPerDay(clampOnChange(e.target.value, 10));
  const onBlurTrim = (setter) => (e) => setter(e.target.value.trim());

  // derived ints and UI flags
  const lenInt = Number.parseInt(lengthDays, 10);
  const mealsInt = Number.parseInt(mealsPerDay, 10);

  const showNameMax = name.length >= 25;
  const showDaysMax = Number(lengthDays) >= 90;
  const showMealsMax = Number(mealsPerDay) >= 10;

  // Persist changes to DB. Validates inputs. Recomputes flat schedule from weekly data.
  const persist = async () => {
    setErr("");
    if (!name.trim()) { setErr("Name required"); return null; }
    if (!Number.isInteger(lenInt) || lenInt < 1 || lenInt > 90) { setErr("Length (days) must be 1–90"); return null; }
    if (!Number.isInteger(mealsInt) || mealsInt < 1 || mealsInt > 10) { setErr("Meals/day must be 1–10"); return null; }

    const base = Array.isArray(plan?.meal_names) ? plan.meal_names : [];
    const meal_names = base.slice(0, mealsInt);
    while (meal_names.length < mealsInt) meal_names.push(`Meal ${meal_names.length + 1}`);

    const weeks = plan?.plan_recipes?.weeks || {};
    const patch = {
      name: name.trim(),
      length_days: lenInt,
      meals_per_day: mealsInt,
      meal_names,
      objective: { ...(plan.objective || {}), start_date: startDate },
      plan_recipes: {
        weeks,
        flat: buildFlatSchedule({ ...plan, length_days: lenInt, meal_names, plan_recipes: { weeks } }),
      },
    };

    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("plans_v1")
        .update(patch)
        .eq("plan_id", plan.plan_id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      setErr(e.message || "Update failed");
      return null;
    } finally {
      setBusy(false);
    }
  };

  // Update in place without leaving editor
  const updateAndRefresh = async () => {
    const data = await persist();
    if (!data) return;
    onUpdate?.(data);
  };
  // Save and exit parent edit mode
  const saveAndExit = async () => {
    const data = await persist();
    if (!data) return;
    onSave?.(data);
  };

  // Layout
  return (
    <Card style={{ width: fullWidth ? "100%" : undefined }}>
      <Flex align="center" justify="between" p="3" wrap="wrap" gap="3">
        {/* Inputs group */}
        <Flex align="center" gap="5" wrap="wrap" style={{ flex: 1 }}>
          <Flex direction="column" gap="1" style={{ minWidth: 180, flex: "1 1 180px" }}>
            <Flex align="center" gap="2">
              <Text size="2" color="gray">Name</Text>
              {showNameMax && <Text size="2" color="red">max. reached</Text>}
            </Flex>
            <TextField.Root
              placeholder="Plan name"
              value={name}
              maxLength={25}
              onChange={onChangeName}
              onBlur={onBlurTrim(setName)}
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Flex align="center" gap="2">
              <Text size="2" color="gray">Length (days)</Text>
              {showDaysMax && <Text size="2" color="red">max. reached</Text>}
            </Flex>
            <TextField.Root
              type="number"
              min={1}
              max={90}
              value={lengthDays}
              onChange={onChangeDays}
              onBlur={onBlurTrim(setLengthDays)}
              style={{ width: 90 }}
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Flex align="center" gap="2">
              <Text size="2" color="gray">Start on</Text>
            </Flex>
            <TextField.Root
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: 160 }}
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Flex align="center" gap="2">
              <Text size="2" color="gray">Meals per day</Text>
              {showMealsMax && <Text size="2" color="red">max. reached</Text>}
            </Flex>
            <TextField.Root
              type="number"
              min={1}
              max={10}
              value={mealsPerDay}
              onChange={onChangeMeals}
              onBlur={onBlurTrim(setMealsPerDay)}
              style={{ width: 90 }}
            />
          </Flex>
        </Flex>

        {/* Actions */}
        <Flex align="center" gap="2" wrap="wrap" onClick={(e)=>e.stopPropagation()}>
          {err ? <Text size="2" color="red">{err}</Text> : null}
          <Button variant="soft" onClick={updateAndRefresh} disabled={busy}>
            {busy ? "Updating…" : "Update"}
          </Button>
          <Button onClick={saveAndExit} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
