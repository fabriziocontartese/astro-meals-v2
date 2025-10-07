// src/components/ui/KeyNumber.jsx

import { Card, Heading, Text } from "@radix-ui/themes";

export default function KeyNumber({ label, value }) {
  return (
    <Card variant="classic" size="2">
      <Text size="1" color="gray">{label}</Text>
      <Heading as="div" size="6" style={{ lineHeight: 1, marginTop: 6 }}>{value}</Heading>
    </Card>
  );
}
