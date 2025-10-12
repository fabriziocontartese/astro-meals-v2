import React, { useState } from "react";
import { Flex, Button, Card, Text, Separator } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient";

export default function PlanEditCalendar({ plan, onUpdate }) {
  const [currentWeek, setCurrentWeek] = useState(1);
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const meals = plan?.meal_names || ["Breakfast", "Lunch", "Snack", "Dinner"];
  const weeksObj = plan?.plan_recipes?.weeks ?? {};
  const weekData = weeksObj[currentWeek - 1] ?? {};

  const addMeal = async (day, mealType) => {
    try {
      const { data: recipes, error } = await supabase
        .from("recipes_v1")
        .select("recipe_id, name")
        .eq("is_public", true)
        .limit(1);
      if (error) throw error;
      const recipe = recipes?.[0] || { recipe_id: null, name: `New ${mealType}` };
      const newMeal = { type: mealType, name: recipe.name, recipe_id: recipe.recipe_id };
      const updatedDay = [...(weekData[day] || []), newMeal];
      const updatedWeek = { ...weekData, [day]: updatedDay };
      const updatedWeeks = { ...weeksObj, [currentWeek - 1]: updatedWeek };
      onUpdate?.({ ...plan, plan_recipes: { ...(plan.plan_recipes || {}), weeks: updatedWeeks } });
    } catch (err) {
      console.error("Error adding meal:", err);
    }
  };

  return (
    <Card style={{ flex: 2, minWidth: 340 }}>
      <Flex align="center" justify="between" p="3" gap="3" wrap="wrap">
        <Flex align="center" gap="2">
          <Text weight="bold">Editor</Text>
        </Flex>
        <Flex align="center" gap="2">
          <Button variant="ghost" onClick={() => setCurrentWeek((w) => Math.max(1, w - 1))}>←</Button>
          <Text>Week {currentWeek}</Text>
          <Button variant="ghost" onClick={() => setCurrentWeek((w) => w + 1)}>→</Button>
        </Flex>
      </Flex>
      <Separator size="4" />
      <Flex gap="3" p="3" wrap="wrap">
        {days.map((day) => (
          <Card key={day} style={{ flex: 1, minWidth: 180 }}>
            <Flex direction="column" p="3" gap="2">
              <Text weight="bold">{day}</Text>
              {meals.map((m) => (
                <Card key={m} variant="ghost">
                  <Flex p="2" align="center" justify="between">
                    <Text size="2">{m}</Text>
                    <Button size="1" variant="soft" onClick={() => addMeal(day, m)}>Add</Button>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Card>
        ))}
      </Flex>
      <Flex justify="center" pb="3">
        <Text size="2" color="gray">● ○ ○ ○ ○ ○ ○</Text>
      </Flex>
    </Card>
  );
}
