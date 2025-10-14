// src/components/plan/PlanCreate.jsx
import React, { useState, useEffect } from "react";
import { Card, Flex, Button, Heading, Text, TextField } from "@radix-ui/themes";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../auth/supabaseClient.js";

const PRESETS = ["Breakfast", "Lunch", "Dinner"];
const defaultName = (i) => PRESETS[i] || `Meal ${i + 1}`;

export default function PlanCreate({ onCreate }) {
  const [name, setName] = useState("");
  const [lengthDays, setLengthDays] = useState("14");
  const [mealsPerDay, setMealsPerDay] = useState("3");
  const [mealNames, setMealNames] = useState(["Breakfast", "Lunch", "Dinner"]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const mealsInt = Number.parseInt(mealsPerDay, 10);
  const validMeals =
    Number.isInteger(mealsInt) && mealsInt > 0 ? Math.min(mealsInt, 10) : null;

  useEffect(() => {
    if (!validMeals) return;
    setMealNames((prev) => {
      const next = prev.slice(0, validMeals);
      while (next.length < validMeals) next.push(defaultName(next.length));
      return next;
    });
  }, [validMeals]);

  const handleCreate = async () => {
    setError("");

    const len = Number.parseInt(lengthDays, 10);
    const meals = Number.parseInt(mealsPerDay, 10);

    if (!name.trim()) return setError("Name required");
    if (!Number.isInteger(len) || len < 1 || len > 90)
      return setError("Length (days) must be 1–90");
    if (!Number.isInteger(meals) || meals < 1 || meals > 10)
      return setError("Meals/day must be 1–10");

    const trimmedMeals = (mealNames || [])
      .slice(0, meals)
      .map((m) => (m || "").trim());
    if (trimmedMeals.length !== meals || trimmedMeals.some((m) => !m))
      return setError("Define all meal names");

    setBusy(true);
    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const owner_profile_id = user?.id;
      if (!owner_profile_id) throw new Error("Not authenticated");

      await supabase
        .from("profiles_v1")
        .upsert({ profile_id: owner_profile_id }, { onConflict: "profile_id" });

      const insertRow = {
        owner_profile_id,
        name: name.trim(),
        length_days: len,
        meals_per_day: meals,
        meal_names: trimmedMeals,
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
      navigate(`/plan/${owner_profile_id}/${data.plan_id}`, { replace: true });

      setName("");
      setLengthDays("14");
      setMealsPerDay("3");
      setMealNames(["Breakfast", "Lunch", "Snack", "Dinner"]);
    } catch (e) {
      setError(e.message || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const onChangeName = (e) => {
    const v = e.target.value.slice(0, 25);
    setName(v);
  };

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

  const showNameMax = name.length >= 25;
  const showDaysMax = Number(lengthDays) >= 90;
  const showMealsMax = Number(mealsPerDay) >= 10;

  return (
    <Card>
      <Flex direction="column" p="3" gap="3">
        <Heading size="4">Create Plan</Heading>
        {error ? (
          <Text size="2" color="red">
            {error}
          </Text>
        ) : null}

        <Flex direction="column" gap="2">
          <Flex align="center" gap="2">
            <Text size="2">Name</Text>
            {showNameMax && (
              <Text size="2" color="red">
                max. reached
              </Text>
            )}
          </Flex>
          <TextField.Root
            placeholder="e.g. 6-week Cutting, Veggie Bulking, No Sugar Month Challenge"
            value={name}
            maxLength={25}
            onChange={onChangeName}
            onBlur={onBlurTrim(setName)}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Flex align="center" gap="2">
            <Text size="2">Length (days)</Text>
            {showDaysMax && (
              <Text size="2" color="red">
                max. reached
              </Text>
            )}
          </Flex>
          <TextField.Root
            type="number"
            min={1}
            max={90}
            value={lengthDays}
            onChange={onChangeDays}
            onBlur={onBlurTrim(setLengthDays)}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Flex align="center" gap="2">
            <Text size="2">Meals per day</Text>
            {showMealsMax && (
              <Text size="2" color="red">
                max. reached
              </Text>
            )}
          </Flex>
          <TextField.Root
            type="number"
            min={1}
            max={10}
            value={mealsPerDay}
            onChange={onChangeMeals}
            onBlur={onBlurTrim(setMealsPerDay)}
          />
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2">Meal names</Text>
          <Flex direction="column" gap="2">
            {Array.from({ length: validMeals || 0 }, (_, i) => (
              <Flex key={`mn-${i}`} align="center" gap="2">
                <Text size="2" style={{ width: 22, textAlign: "right" }}>
                  {i + 1}.
                </Text>
                <input
                  value={mealNames[i] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMealNames((prev) => {
                      const next = prev.slice();
                      next[i] = v;
                      return next;
                    });
                  }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    setMealNames((prev) => {
                      const next = prev.slice();
                      next[i] = v;
                      return next;
                    });
                  }}
                  size={Math.max(1, (mealNames[i] || "").length)}
                  placeholder={defaultName(i)}
                  style={{
                    width: `${Math.max(3, (mealNames[i] || "").length + 3)}ch`,
                    minWidth: "12ch",
                    maxWidth: "100%",
                    padding: "6px 8px",
                    fontSize: 13,
                    border: "1px solid var(--gray-6)",
                    borderRadius: 8,
                    background: "white",
                  }}
                />
              </Flex>
            ))}
            {!validMeals ? (
              <Text size="2" color="gray">
                Set “Meals per day” to edit names
              </Text>
            ) : null}
          </Flex>
        </Flex>

        <Button onClick={handleCreate} disabled={busy}>
          {busy ? "Creating..." : "Create"}
        </Button>
      </Flex>
    </Card>
  );
}
