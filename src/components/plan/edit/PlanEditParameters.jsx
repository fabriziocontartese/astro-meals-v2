// src/components/plan/edit/PlanEditParameters.jsx
import React, { useState } from "react";
import { Card, Flex, Button, TextField, Text } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient";

const dayNames = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

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

export default function PlanEditParameters({ plan, onSave, fullWidth=false }) {
  const [lengthDays, setLengthDays] = useState(plan?.length_days ?? 42);
  const [mealsPerDay, setMealsPerDay] = useState(plan?.meals_per_day ?? 4);
  const [startDate, setStartDate] = useState(
    plan?.objective?.start_date ?? new Date().toISOString().slice(0, 10)
  );
  const [name, setName] = useState(plan?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleBack = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      window.location.href = "/plans";
    } catch {
      console.error("Navigation to /plans failed");
    }
  };
  

  const update = async () => {
    setErr("");
    if (!name.trim()) return setErr("Name required");
    if (!Number.isInteger(lengthDays) || lengthDays < 1) return setErr("Length ≥ 1");
    if (!Number.isInteger(mealsPerDay) || mealsPerDay < 1) return setErr("Meals/day ≥ 1");

    const meal_names = (plan?.meal_names || []).slice(0, mealsPerDay);
    while (meal_names.length < mealsPerDay) meal_names.push(`Meal ${meal_names.length + 1}`);

    const weeks = plan?.plan_recipes?.weeks || {};
    const nextPlanShape = {
      ...plan,
      name: name.trim(),
      length_days: lengthDays,
      meals_per_day: mealsPerDay,
      meal_names,
      objective: { ...(plan.objective || {}), start_date: startDate },
      plan_recipes: { weeks, flat: buildFlatSchedule({ ...plan, length_days: lengthDays, meal_names, plan_recipes: { weeks } }) },
      nutrition: plan?.nutrition || undefined,
    };

    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("plans_v1")
        .update({
          name: nextPlanShape.name,
          length_days: nextPlanShape.length_days,
          meals_per_day: nextPlanShape.meals_per_day,
          meal_names: nextPlanShape.meal_names,
          objective: nextPlanShape.objective,
          plan_recipes: nextPlanShape.plan_recipes,
        })
        .eq("plan_id", plan.plan_id)
        .select("*")
        .single();
      if (error) throw error;
      onSave?.(data);
    } catch (e) {
      setErr(e.message || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ width: fullWidth ? "100%" : undefined }}>
      <Flex align="center" justify="between" p="3" wrap="wrap" gap="3">
        <Flex align="center" gap="5" wrap="wrap" style={{ flex: 1 }}>
          <TextField.Root
            placeholder="Plan name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ minWidth: 150, flex: "1 1 150px" }}
          />
          <Flex align="center" gap="2">
            <Text size="2" color="gray">Length</Text>
            <TextField.Root
              type="number"
              min={1}
              value={lengthDays}
              onChange={(e) => setLengthDays(Number(e.target.value))}
              style={{ width: 50 }}
            />
            <Text size="2" color="gray">days</Text>
          </Flex>
          <Flex align="center" gap="2">
            <Text size="2" color="gray">Start on</Text>
            <TextField.Root
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: 150 }}
            />
          </Flex>
          <Flex align="center" gap="2">
            <Text size="2" color="gray">Meals x day</Text>
            <TextField.Root
              type="number"
              min={1}
              max={10}
              value={mealsPerDay}
              onChange={(e) => setMealsPerDay(Number(e.target.value))}
              style={{ width: 50 }}
            />
          </Flex>
        </Flex>
        <Flex align="center" gap="2" wrap="wrap" onClick={(e)=>e.stopPropagation()}>
          {err ? <Text size="2" color="red">{err}</Text> : null}
          <Button onClick={update} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          <Button variant="ghost" onClick={handleBack}>Back</Button>
        </Flex>
      </Flex>
    </Card>
  );
}
