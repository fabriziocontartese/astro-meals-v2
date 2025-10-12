import React, { useState } from "react";
import { Flex, Card, Text, Button } from "@radix-ui/themes";
import PlanEditParameters from "./PlanEditParameters.jsx";
import PlanEditCalendar from "./PlanEditCalendar.jsx";
import PlanEditNutrition from "./PlanEditNutrition.jsx";

export default function PlanEdit({ plan, onSave, onBack }) {
  const [currentPlan, setCurrentPlan] = useState(plan);

  const handleSaved = (saved) => {
    setCurrentPlan(saved);
    onSave?.(saved);
  };

  return (
    <div>
      <PlanEditParameters plan={currentPlan} onSave={handleSaved} onBack={onBack} />
      <Flex gap="4" wrap="wrap">
        <Card size="3" style={{ flex: 1, minWidth: 260 }}>
          <Flex direction="column" p="3" gap="3">
            <Text size="4">Filters</Text>
            <Text size="2" color="gray">Category, etc.</Text>
            <Text size="4" mt="2">Meal Templates</Text>
            <Flex direction="column" gap="2">
              <Button size="2" variant="soft">Meal 1</Button>
              <Button size="2" variant="soft">Meal 2</Button>
              <Button size="2" variant="soft">Meal 3</Button>
            </Flex>
          </Flex>
        </Card>
        <PlanEditCalendar plan={currentPlan} onUpdate={setCurrentPlan} />
        <PlanEditNutrition plan={currentPlan} onUpdate={setCurrentPlan} />
      </Flex>
    </div>
  );
}
