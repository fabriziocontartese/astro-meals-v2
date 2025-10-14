import React, { useMemo } from "react";
import { Flex, Button, Heading, Tabs, Card, Text, DropdownMenu } from "@radix-ui/themes";
import PlanViewCalendar from "./PlanViewCalendar.jsx";
import PlanViewNutrition from "./PlanViewNutrition.jsx";

export default function PlanView({ plan, plans = [], ownerGoals, onEdit, onSelectPlan, onCreateNew }) {
  const [viewMode, setViewMode] = React.useState("week");

  const vitamins = useMemo(() => {
    if (!ownerGoals) return "";
    const map = { micro_vitA: "A", micro_vitC: "C", micro_vitD: "D" };
    return Object.entries(map)
      .filter(([k]) => ownerGoals?.[k])
      .map(([, v]) => v)
      .join(" • ");
  }, [ownerGoals]);

  const minerals = useMemo(() => {
    if (!ownerGoals) return "";
    const map = { micro_calcium: "Ca", micro_iron: "Fe", micro_zinc: "Zn", micro_magnesium: "Mg" };
    return Object.entries(map)
      .filter(([k]) => ownerGoals?.[k])
      .map(([, v]) => v)
      .join(" • ");
  }, [ownerGoals]);

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex align="center" justify="between" wrap="wrap" p="3" gap="3">
          <Heading size="6">Current Plan: {plan?.name ?? "—"}</Heading>
          <Flex align="center" gap="3" wrap="wrap">
            <Tabs.Root value={viewMode} onValueChange={setViewMode}>
              <Tabs.List>
                <Tabs.Trigger value="day">Day</Tabs.Trigger>
                <Tabs.Trigger value="week">Week</Tabs.Trigger>
                <Tabs.Trigger value="full">Full Plan</Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>

            <Button onClick={onEdit}>Edit</Button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button variant="soft">Select plan</Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                {plans.map((p) => (
                  <DropdownMenu.Item key={p.plan_id} onSelect={() => onSelectPlan?.(p)}>
                    {p.name || "Untitled"} • {p.length_days}d
                  </DropdownMenu.Item>
                ))}
                <DropdownMenu.Separator />
                <DropdownMenu.Item onSelect={onCreateNew}>+ Create new</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>
        </Flex>
      </Card>

      <PlanViewCalendar plan={plan} viewMode={viewMode} />

      <Flex gap="4" direction={{ initial: "column", md: "row" }}>
        <PlanViewNutrition ownerGoals={ownerGoals} />
        <Card style={{ flex: 1 }}>
          <Flex direction="column" p="3" gap="3">
            <Text size="4" weight="bold">Vitamins</Text>
            <Card variant="ghost">
              <Text size="2" color="gray">{vitamins || "—"}</Text>
            </Card>
            <Text size="4" weight="bold" mt="2">Minerals</Text>
            <Card variant="ghost">
              <Text size="2" color="gray">{minerals || "—"}</Text>
            </Card>
          </Flex>
        </Card>
      </Flex>
    </Flex>
  );
}
