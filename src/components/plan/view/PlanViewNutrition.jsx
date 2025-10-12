import React, { useState, useEffect } from "react";
import { Flex, Card, Text, Progress } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient";

const pct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

export default function PlanViewNutrition() {
  const [nutrition, setNutrition] = useState({ energy: 1974, protein: 70, carb: 60, starch: 50, fiber: 40, fat: 30 });

  useEffect(() => {
    const fetchNutrition = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId) return;
        const { data, error } = await supabase
          .from("goals_v1")
          .select("macro_protein_total, macro_carb_total, macro_carb_starch, macro_carb_fiber, macro_fat_total")
          .eq("profile_id", userId)
          .single();
        if (error) throw error;
        setNutrition({
          energy: 2000,
          protein: data?.macro_protein_total ?? 70,
          carb: data?.macro_carb_total ?? 60,
          starch: data?.macro_carb_starch ?? 50,
          fiber: data?.macro_carb_fiber ?? 40,
          fat: data?.macro_fat_total ?? 30,
        });
      } catch (err) {
        console.error("Error fetching nutrition:", err);
      }
    };
    fetchNutrition();
  }, []);

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
