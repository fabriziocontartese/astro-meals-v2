import React, { useMemo } from "react";
import { Flex, Card, Text, Progress } from "@radix-ui/themes";

const pct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

export default function PlanViewNutrition({ ownerGoals }) {
  const nutrition = useMemo(() => ({
    energy: 2000,
    protein: ownerGoals?.macro_protein_total ?? 70,
    carb: ownerGoals?.macro_carb_total ?? 60,
    starch: ownerGoals?.macro_carb_starch ?? 50,
    fiber: ownerGoals?.macro_carb_fiber ?? 40,
    fat: ownerGoals?.macro_fat_total ?? 30,
  }), [ownerGoals]);

  return (
    <Card style={{ flex: 1 }}>
      <Flex direction="column" p="3" gap="3">
        <Text size="4" weight="bold">Energy</Text>
        <Text size="7" weight="bold">{nutrition.energy} kcal</Text>
        <Progress value={pct((nutrition.energy / 2000) * 100)} />
        <Flex justify="space-between">
          <Text size="2" color="gray">Basal MR 1500</Text>
          <Text size="2" color="gray">Activity 500</Text>
          <Text size="2" color="gray">Goal 200</Text>
          <Text size="2" color="gray">Target 2000</Text>
        </Flex>

        <Text size="4" weight="bold" mt="2">Nutrition</Text>
        <Flex direction="column" gap="2">
          <div><Text>Protein</Text><Progress value={pct(nutrition.protein)} /></div>
          <div><Text>Carb</Text><Progress value={pct(nutrition.carb)} /></div>
          <div><Text>Starch</Text><Progress value={pct(nutrition.starch)} /></div>
          <div><Text>Fiber</Text><Progress value={pct(nutrition.fiber)} /></div>
          <div><Text>Fat</Text><Progress value={pct(nutrition.fat)} /></div>
        </Flex>
      </Flex>
    </Card>
  );
}
