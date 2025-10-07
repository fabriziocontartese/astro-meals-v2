// src/components/ui/Feature.jsx

import { Card, Flex, Heading, Text } from "@radix-ui/themes";

export function Feature({ icon, title, desc }) {
  return (
    <Card size="3" style={{ height: "100%" }}>
      <Flex direction="column" gap="2">
        <Flex
          align="center"
          justify="center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid var(--gray-5)",
          }}
        >
          {icon}
        </Flex>
        <Heading size="3">{title}</Heading>
        <Text size="2" color="gray">
          {desc}
        </Text>
      </Flex>
    </Card>
  );
}
