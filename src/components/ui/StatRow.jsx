// src/components/ui/StatRow.jsx

import { Flex, Text } from "@radix-ui/themes";

export default function StatRow({ label, value, compact = false }) {
  return (
    <Flex
      align="center"
      justify="between"
      py={compact ? "1" : "2"}
      style={{ borderBottom: "1px dashed var(--gray-4)" }}
    >
      <Text size={compact ? "1" : "2"} color="gray">{label}</Text>
      <Text size={compact ? "1" : "2"} weight="medium">{value}</Text>
    </Flex>
  );
}
