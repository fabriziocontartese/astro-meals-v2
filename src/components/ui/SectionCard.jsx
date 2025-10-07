// src/components/ui/SectionCard.jsx

import { Card, Flex, Heading, Separator } from "@radix-ui/themes";

export default function SectionCard({ title, right, children, sticky = false }) {
  return (
    <Card size="3" style={sticky ? { position: "sticky", top: 16, height: "fit-content" } : undefined}>
      <Flex align="center" justify="between">
        <Heading size="4" style={{ marginTop: 0 }}>{title}</Heading>
        {right}
      </Flex>
      <Separator my="3" />
      {children}
    </Card>
  );
}
