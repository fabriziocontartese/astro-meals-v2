import React, { useState } from "react";
import { Flex, Button, Text, Card, Separator } from "@radix-ui/themes";

export default function PlanViewCalendar({ plan, viewMode }) {
  const [currentWeek, setCurrentWeek] = useState(3);
  const totalWeeks = 6;

  const daysWeek = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const meals = plan?.meal_names || ["Breakfast", "Lunch", "Snack", "Dinner"];
  const displayedDays = viewMode === "day" ? [daysWeek[0]] : daysWeek;

  const getMealsForDay = (day) =>
    plan?.plan_recipes?.weeks?.[currentWeek - 1]?.[day] || [];

  return (
    <Card>
      <Flex align="center" justify="between" p="3" gap="3" wrap="wrap">
        <Button variant="ghost" onClick={() => setCurrentWeek((w) => Math.max(1, w - 1))}>←</Button>
        <Text size="3">Week {currentWeek}/{totalWeeks}</Text>
        <Button variant="ghost" onClick={() => setCurrentWeek((w) => Math.min(totalWeeks, w + 1))}>→</Button>
        <Button size="2" onClick={() => setCurrentWeek(3)}>Today</Button>
      </Flex>
      <Separator size="4" />
      <Flex gap="3" p="3" direction={{ initial: "column", md: "row" }}>
        {displayedDays.map((day) => (
          <Card key={day} style={{ flex: 1, minWidth: 180 }}>
            <Flex direction="column" p="3" gap="2">
              <Text weight="bold">{day}</Text>
              {meals.map((m) => {
                const dayMeals = getMealsForDay(day).filter((meal) => meal.type === m);
                return (
                  <Card key={m} variant="ghost">
                    <Flex p="2" align="center" justify="between">
                      <Text size="2">{m}</Text>
                      <Text size="2" color="gray">
                        {dayMeals.map((meal) => meal.name).join(" • ") || "No meals"}
                      </Text>
                    </Flex>
                  </Card>
                );
              })}
            </Flex>
          </Card>
        ))}
      </Flex>
    </Card>
  );
}
