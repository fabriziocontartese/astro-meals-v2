// src/components/plan/edit/NutritionTargets.jsx
import React from "react";
import PlanEditNutrition from "./PlanEditNutrition.jsx";

export default function NutritionTargets({ plan, onUpdate }) {
  return <PlanEditNutrition plan={plan} onUpdate={onUpdate} />;
}
