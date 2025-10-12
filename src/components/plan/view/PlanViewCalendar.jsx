// src/components/plan/view/PlanViewCalendar.jsx
import React, { useMemo, useState } from "react";
import { Flex, Button, Text, Card, Separator, ScrollArea } from "@radix-ui/themes";

const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseISODate(s) {
  const d = s ? new Date(s) : new Date();
  // normalize to local midnight
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function PlanViewCalendar({ plan, viewMode }) {
  const meals = plan?.meal_names || ["Breakfast", "Lunch", "Snack", "Dinner"];
  const useFlat = !!plan?.plan_recipes?.flat?.days;

  const length = Number(plan?.plan_recipes?.flat?.length_days || plan?.length_days || 0);
  const totalWeeks = Math.max(1, Math.ceil(length / 7));
  const [week, setWeek] = useState(1);

  const startDate = parseISODate(plan?.objective?.start_date);

  const markers = useMemo(() => Array.from({ length: totalWeeks }, (_, i) => i + 1), [totalWeeks]);

  // 1-based absolute day indices for this week
  const dayIndexRange = useMemo(() => {
    const start = (week - 1) * 7 + 1;
    return Array.from({ length: 7 }, (_, i) => start + i);
  }, [week]);

  // Return the scheduled item for given absolute day index and meal
  const getItem = (dayIdx1, mealType) => {
    if (useFlat) {
      const flatDay = plan?.plan_recipes?.flat?.days?.[String(dayIdx1)] || {};
      const idx = meals.findIndex((m) => m === mealType);
      const hit = flatDay[String(idx + 1)] || null;
      return hit ? { type: mealType, ...hit } : null;
    }
    const weekIdx0 = Math.floor((dayIdx1 - 1) / 7);
    const dayName = dayNames[(addDays(startDate, dayIdx1 - 1).getDay())];
    const arr = plan?.plan_recipes?.weeks?.[weekIdx0]?.[dayName] || [];
    return arr.find((x) => x.type === mealType) || null;
  };

  const displayedDays = viewMode === "day" ? [dayIndexRange[0]] : dayIndexRange;

  return (
    <Card>
      <Flex align="center" justify="between" p="3" gap="3" wrap="wrap">
        <Flex align="center" gap="2">
          <Button variant="soft" size="1" onClick={() => setWeek((w) => Math.max(1, w - 1))}>←</Button>
          <Text size="2">Week {week}/{totalWeeks}</Text>
          <Button variant="soft" size="1" onClick={() => setWeek((w) => Math.min(totalWeeks, w + 1))}>→</Button>
        </Flex>
      </Flex>
      <Separator size="4" />

      <ScrollArea type="auto" scrollbars="horizontal" style={{ padding: "8px 8px 12px" }}>
        <div style={{ minWidth: 680 }}>
          {/* Day columns inside grey containers */}
          <Flex gap="10px" align="stretch">
            {displayedDays.map((dayIdx1) => {
              const dateObj = addDays(startDate, dayIdx1 - 1);
              const headerTop = `${dateObj.getDate()} ${monthShort[dateObj.getMonth()]}`;
              const headerBottom = dayNames[dateObj.getDay()];

              return (
                <div
                  key={dayIdx1}
                  style={{
                    flex: "1 1 0",
                    minWidth: 120,
                    borderRadius: 10,
                    border: "1px solid var(--gray-6)",
                    background: "var(--gray-2)",
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ textAlign: "center", lineHeight: 1.15 }}>
                    <Text size="2" weight="bold">{headerTop}</Text>
                    <div style={{ fontSize: 12, color: "var(--gray-11)" }}>{headerBottom}</div>
                  </div>

                  {/* Meals list for this day */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {meals.map((meal) => {
                      const item = getItem(dayIdx1, meal);
                      return (
                        <div
                          key={`${dayIdx1}-${meal}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            borderRadius: 8,
                            border: "1px solid var(--gray-5)",
                            background: "var(--color-panel)",
                            padding: 6,
                            minHeight: 56,
                          }}
                          title={item ? `${meal}: ${item.name}` : `${meal}: No recipe`}
                        >
                          {item?.image_url ? (
                            <img
                              src={item.image_url}
                              alt=""
                              onError={(ev) => (ev.currentTarget.style.display = "none")}
                              style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, flex: "0 0 auto" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 8,
                                border: "1px dashed var(--gray-7)",
                                flex: "0 0 auto",
                              }}
                            />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <Text size="1" color="gray">{meal}</Text>
                            <div
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontSize: 13,
                              }}
                            >
                              {item?.name || "—"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Flex>
        </div>
      </ScrollArea>

      {/* week dots */}
      <Flex justify="center" mb="3" gap="6px">
        {markers.map((i) => (
          <div
            key={i}
            onClick={() => setWeek(i)}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: i === week ? "var(--accent-9)" : "var(--gray-6)",
              cursor: "pointer",
            }}
          />
        ))}
      </Flex>
    </Card>
  );
}
