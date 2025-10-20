// src/components/plan/edit/PlanEdit.jsx
import React, { useState } from "react";
import { Flex, Card } from "@radix-ui/themes";
import RecipePicker from "../components/plan/edit/PlanRecipePicker";
import PlanEditParameters from "../components/plan/edit/PlanEditParameters.jsx";
import PlanEditCalendar from "../components/plan/edit/PlanEditCalendar.jsx";
import NutritionTargets from "../components/plan/edit/NutritionTargets.jsx";

export default function PlanEdit({ plan, onSave }) {
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  return (
    <Flex direction="column" gap="3">
      <PlanEditParameters
        plan={currentPlan}
        onUpdate={(p) => setCurrentPlan(p)}
        onSave={(p) => { setCurrentPlan(p); onSave?.(p); }}
        fullWidth
      />

      <Flex gap="3" align="start" wrap="wrap">
        <RecipePicker selected={selectedRecipe} onSelect={setSelectedRecipe} />
        <Card style={{ flex: "1 1 720px", minWidth: 720, overflow: "hidden" }}>
          <PlanEditCalendar
            plan={currentPlan}
            onUpdate={setCurrentPlan}
            selectedRecipe={selectedRecipe}
          />
        </Card>
      </Flex>

      <NutritionTargets plan={currentPlan} onUpdate={setCurrentPlan} />
    </Flex>
  );
}
