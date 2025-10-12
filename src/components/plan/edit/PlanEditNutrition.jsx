import React, { useState } from "react";
import { Card, Text, Progress, Flex, TextField } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient";

const pct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

export default function PlanEditNutrition({ plan, onUpdate }) {
  const [nutrition, setNutrition] = useState(
    plan?.nutrition || { energy: 1974, protein: 70, carb: 60, starch: 45, fiber: 35, fat: 50 }
  );

  const updateNutrition = async (key, value) => {
    const num = Number(value);
    const updated = { ...nutrition, [key]: Number.isFinite(num) ? num : value };
    setNutrition(updated);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) return;
      const updateData = { [`macro_${key}_total`]: Number.isFinite(num) ? num : null };
      const { error } = await supabase.from("goals_v1").update(updateData).eq("profile_id", userId);
      if (error) throw error;
      onUpdate?.({ ...plan, nutrition: updated });
    } catch (err) {
      console.error("Error updating nutrition:", err);
    }
  };

  return (
    <Card style={{ flex: 1, minWidth: 260 }}>
      <Flex direction="column" p="3" gap="3">
        <Text size="3" color="gray">Day 7 • Sunday • Week 1</Text>

        <Text size="4" weight="bold">Energy</Text>
        <TextField.Root
          inputMode="numeric"
          value={nutrition.energy}
          onChange={(e) => updateNutrition("energy", e.target.value)}
        />

        <Text size="4" weight="bold" mt="2">Macros</Text>
        <Flex direction="column" gap="2">
          {[
            ["protein","Protein"],
            ["carb","Carb"],
            ["starch","Starch"],
            ["fiber","Fiber"],
            ["fat","Fat"],
          ].map(([k, label]) => (
            <div key={k}>
              <Text>{label}</Text>
              <Progress value={pct(nutrition[k])} />
              <TextField.Root
                inputMode="numeric"
                value={nutrition[k]}
                onChange={(e) => updateNutrition(k, e.target.value)}
              />
            </div>
          ))}
        </Flex>

        <Text size="4" weight="bold" mt="2">Vitamins & Minerals</Text>
        <Flex direction="column" gap="2">
          <Card variant="ghost"><Text size="2" color="gray">Vitamins checklist</Text></Card>
          <Card variant="ghost"><Text size="2" color="gray">Minerals checklist</Text></Card>
        </Flex>
      </Flex>
    </Card>
  );
}
