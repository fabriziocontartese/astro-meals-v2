// src/components/plan/edit/PlanEdit.jsx
import React, { useState } from "react";
import { Flex, Card } from "@radix-ui/themes";
import RecipePicker from "./PlanRecipePicker.jsx";
import PlanEditParameters from "./PlanEditParameters.jsx";
import PlanEditCalendar from "./PlanEditCalendar.jsx";
import NutritionTargets from "./NutritionTargets.jsx";

export default function PlanEdit({ plan, onSave, onBack }) {
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  return (
    <Flex direction="column" gap="3">
      <PlanEditParameters
        plan={currentPlan}
        onSave={(p) => { setCurrentPlan(p); onSave?.(p); }}
        onBack={onBack}
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
