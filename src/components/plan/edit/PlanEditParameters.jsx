import React, { useState } from "react";
import { Card, Flex, Button, TextField, Heading, Text } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient";

export default function PlanEditParameters({ plan, onSave, onBack }) {
  const [name, setName] = useState(plan?.name ?? "");
  const [lengthDays, setLengthDays] = useState(plan?.length_days ?? 42);
  const [mealsPerDay, setMealsPerDay] = useState(plan?.meals_per_day ?? 4);
  const [mealNames, setMealNames] = useState(plan?.meal_names ?? ["Breakfast", "Lunch", "Snack", "Dinner"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const update = async () => {
    setErr("");
    if (!name.trim()) return setErr("Name required");
    if (!Number.isInteger(lengthDays) || lengthDays < 1) return setErr("Length must be ≥ 1");
    if (!Number.isInteger(mealsPerDay) || mealsPerDay < 1) return setErr("Meals/day must be ≥ 1");
    if (mealNames.length !== mealsPerDay || mealNames.some((m) => !m.trim())) return setErr("Define all meal names");

    setBusy(true);
    try {
      const patch = {
        name: name.trim(),
        length_days: lengthDays,
        meals_per_day: mealsPerDay,
        meal_names: mealNames.map((m) => m.trim()),
      };
      const { data, error } = await supabase
        .from("plans_v1")
        .update(patch)
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
    <Card style={{ flex: 1, minWidth: 260, maxWidth: 340 }}>
      <Flex direction="column" p="3" gap="3">
        <Heading size="4">Plan Parameters</Heading>
        {err ? <Text size="2" color="red">{err}</Text> : null}

        <Flex direction="column" gap="2">
          <Text size="2">Name</Text>
          <TextField.Root value={name} onChange={(e) => setName(e.target.value)} />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2">Length (days)</Text>
          <TextField.Root
            type="number"
            min={1}
            value={lengthDays}
            onChange={(e) => setLengthDays(Number(e.target.value))}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2">Meals per day</Text>
          <TextField.Root
            type="number"
            min={1}
            max={10}
            value={mealsPerDay}
            onChange={(e) => {
              const n = Number(e.target.value);
              setMealsPerDay(n);
              setMealNames((prev) => {
                if (prev.length < n) {
                  const next = [...prev];
                  for (let i = prev.length; i < n; i++) next.push(`Meal ${i + 1}`);
                  return next;
                }
                if (prev.length > n) return prev.slice(0, n);
                return prev;
              });
            }}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2">Meal names (comma-separated)</Text>
          <TextField.Root
            value={mealNames.join(", ")}
            onChange={(e) =>
              setMealNames(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
            }
          />
        </Flex>

        <Flex gap="2" mt="2" wrap="wrap">
          <Button onClick={update} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
          <Button variant="ghost" onClick={onBack}>Back</Button>
        </Flex>
      </Flex>
    </Card>
  );
}
