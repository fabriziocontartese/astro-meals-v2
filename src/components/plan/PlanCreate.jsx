// src/components/plan/PlanCreate.jsx
import React, { useState, useEffect } from "react";
import { Card, Flex, Button, Heading, Text, TextField } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../auth/supabaseClient.js";

export default function PlanCreate({ onCreate }) {
  const [name, setName] = useState("");
  const [lengthDays, setLengthDays] = useState(42);
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [mealNames, setMealNames] = useState(["Breakfast", "Lunch", "Snack", "Dinner"]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMealNames((prev) => {
      if (prev.length < mealsPerDay) {
        const next = [...prev];
        for (let i = prev.length; i < mealsPerDay; i++) next.push(`Meal ${i + 1}`);
        return next;
      }
      if (prev.length > mealsPerDay) return prev.slice(0, mealsPerDay);
      return prev;
    });
  }, [mealsPerDay]);

  const handleCreate = async () => {
    setError("");
    if (!name.trim()) return setError("Name required");
    if (!Number.isInteger(lengthDays) || lengthDays < 1) return setError("Length must be ≥ 1");
    if (!Number.isInteger(mealsPerDay) || mealsPerDay < 1) return setError("Meals/day must be ≥ 1");
    if (mealNames.length !== mealsPerDay || mealNames.some((m) => !m.trim()))
      return setError("Define all meal names");

    setBusy(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const owner_profile_id = user?.id;
      if (!owner_profile_id) throw new Error("Not authenticated");

      await supabase
        .from("profiles_v1")
        .upsert({ profile_id: owner_profile_id }, { onConflict: "profile_id" });

      const insertRow = {
        owner_profile_id,
        name: name.trim(),
        length_days: lengthDays,
        meals_per_day: mealsPerDay,
        meal_names: mealNames.map((m) => m.trim()),
        objective: {},
        is_public: false,
        plan_recipes: {},
      };

      const { data, error } = await supabase
        .from("plans_v1")
        .insert(insertRow)
        .select("*")
        .single();
      if (error) throw error;

      onCreate?.(data);

      // navigate to the new plan route
      navigate(`/plan/${owner_profile_id}/${data.plan_id}`, { replace: true });

      setName("");
      setLengthDays(42);
      setMealsPerDay(4);
      setMealNames(["Breakfast", "Lunch", "Snack", "Dinner"]);
    } catch (e) {
      setError(e.message || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Flex direction="column" p="3" gap="3">
        <Heading size="4">Create Plan</Heading>
        {error ? <Text size="2" color="red">{error}</Text> : null}

        <Flex direction="column" gap="2">
          <Text size="2">Name *</Text>
          <TextField.Root
            placeholder="e.g. 6-week Bulking"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            onChange={(e) => setMealsPerDay(Number(e.target.value))}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2">Meal names (comma-separated)</Text>
          <TextField.Root
            value={mealNames.join(", ")}
            onChange={(e) =>
              setMealNames(
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, mealsPerDay)
              )
            }
          />
        </Flex>

        <Button onClick={handleCreate} disabled={busy}>
          {busy ? "Creating..." : "Create"}
        </Button>
      </Flex>
    </Card>
  );
}
