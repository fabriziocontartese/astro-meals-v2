// src/components/plan/edit/PlanEditNutrition.jsx
import React, { useState } from "react";
import { Card, Text, Progress, Flex, TextField } from "@radix-ui/themes";

const clampPct = (v) => Math.max(0, Math.min(100, Number(v) || 0));

export default function PlanEditNutrition({ plan, onUpdate }) {
  const [nutrition, setNutrition] = useState(
    plan?.nutrition || { energy: 2000, protein: 70, carb: 60, starch: 45, fiber: 35, fat: 50 }
  );

  const setVal = (k, v) => {
    const next = { ...nutrition, [k]: v === "" ? "" : Number(v) };
    setNutrition(next);
    onUpdate?.({ ...plan, nutrition: next });
  };

  return (
    <Card>
      <Flex direction="column" p="3" gap="3">
        <Text size="3" color="gray">Nutrition targets</Text>

        <Text size="2">Energy</Text>
        <TextField.Root
          inputMode="numeric"
          value={nutrition.energy}
          onChange={(e) => setVal("energy", e.target.value)}
          style={{ maxWidth: 160 }}
        />
        <Progress value={clampPct((nutrition.energy / 2000) * 100)} />

        <Flex gap="3" wrap="wrap">
          {[
            ["protein", "Protein"],
            ["carb", "Carb"],
            ["starch", "Starch"],
            ["fiber", "Fiber"],
            ["fat", "Fat"],
          ].map(([k, label]) => (
            <Card key={k} variant="surface" style={{ flex: "1 1 180px", minWidth: 180 }}>
              <Flex direction="column" p="2" gap="2">
                <Text>{label}</Text>
                <Progress value={clampPct(nutrition[k])} />
                <TextField.Root
                  inputMode="numeric"
                  value={nutrition[k]}
                  onChange={(e) => setVal(k, e.target.value)}
                />
              </Flex>
            </Card>
          ))}
        </Flex>
      </Flex>
    </Card>
  );
}
