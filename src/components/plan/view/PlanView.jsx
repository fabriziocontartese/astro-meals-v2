import React, { useState, useEffect } from "react";
import { Flex, Button, Heading, Tabs, Card, Text } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient";
import PlanViewCalendar from "./PlanViewCalendar.jsx";
import PlanViewNutrition from "./PlanViewNutrition.jsx";

export default function PlanView({ plan, onEdit }) {
  const [viewMode, setViewMode] = useState("week");
  const [vitamins, setVitamins] = useState("A • B • C • D • E");
  const [minerals, setMinerals] = useState("Ca • Fe • Zn • Mg");

  useEffect(() => {
    const fetchMicros = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId) return;
        const { data, error } = await supabase
          .from("goals_v1")
          .select("micro_vitA, micro_vitC, micro_vitD, micro_calcium, micro_iron, micro_zinc, micro_magnesium")
          .eq("profile_id", userId)
          .single();
        if (error) throw error;
        setVitamins(
          ["micro_vitA","micro_vitC","micro_vitD"]
            .map((k, i) => (data[k] ? ["A","C","D"][i] : null))
            .filter(Boolean).join(" • ")
        );
        setMinerals(
          ["micro_calcium","micro_iron","micro_zinc","micro_magnesium"]
            .map((k, i) => (data[k] ? ["Ca","Fe","Zn","Mg"][i] : null))
            .filter(Boolean).join(" • ")
        );
      } catch (err) {
        console.error("Error fetching micros:", err);
      }
    };
    fetchMicros();
  }, []);

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
            <Button variant="soft">View all plans</Button>
          </Flex>
        </Flex>
      </Card>

      <PlanViewCalendar plan={plan} viewMode={viewMode} />

      <Flex gap="4" direction={{ initial: "column", md: "row" }}>
        <PlanViewNutrition plan={plan} />
        <Card style={{ flex: 1 }}>
          <Flex direction="column" p="3" gap="3">
            <Text size="4" weight="bold">Vitamins</Text>
            <Card variant="ghost"><Text size="2" color="gray">{vitamins || "—"}</Text></Card>
            <Text size="4" weight="bold" mt="2">Minerals</Text>
            <Card variant="ghost"><Text size="2" color="gray">{minerals || "—"}</Text></Card>
          </Flex>
        </Card>
      </Flex>
    </Flex>
  );
}
