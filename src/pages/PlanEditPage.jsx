// src/pages/PlanEdit.jsx
// High-level: Edit workflow shell. Orchestrates parameters, recipe picking, calendar assignment, and nutrition targets.

import React, { useState } from "react";
import { Flex, Card } from "@radix-ui/themes";
import RecipePicker from "../components/plan/edit/PlanRecipePicker";
import PlanEditParameters from "../components/plan/edit/PlanEditParameters.jsx";
import PlanEditCalendar from "../components/plan/edit/PlanEditCalendar.jsx";
import NutritionTargets from "../components/plan/edit/NutritionTargets.jsx";

export default function PlanEdit({ plan, onSave }) {
  // Local working copy of the plan while editing.
  const [currentPlan, setCurrentPlan] = useState(plan);
  // Currently highlighted recipe to place into the calendar.
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  return (
    <Flex direction="column" gap="3">
      {/* Parameters panel: name, length, meals/day, and save action. */}
      <PlanEditParameters
        plan={currentPlan}
        onUpdate={(p) => setCurrentPlan(p)}
        onSave={(p) => { setCurrentPlan(p); onSave?.(p); }}
        fullWidth
      />

      {/* Main work area: recipe picker + calendar assignment grid. */}
      <Flex gap="3" align="start" wrap="wrap">
        {/* Left: searchable recipe/component picker, sets selection for placement. */}
        <RecipePicker selected={selectedRecipe} onSelect={setSelectedRecipe} />
        {/* Right: calendar editor. Accepts selectedRecipe to drop into days/meals. */}
        <Card style={{ flex: "1 1 720px", minWidth: 720, overflow: "hidden" }}>
          <PlanEditCalendar
            plan={currentPlan}
            onUpdate={setCurrentPlan}
            selectedRecipe={selectedRecipe}
          />
        </Card>
      </Flex>

      {/* Targets panel: shows computed totals vs user goals and allows adjustments. */}
      <NutritionTargets plan={currentPlan} onUpdate={setCurrentPlan} />
    </Flex>
  );
}
