// src/components/Footer.jsx
import { Box, Container, Flex, Separator, Text } from "@radix-ui/themes";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <Box asChild className="footer" mt="5">
      <footer className="app-footer">
        <Container py="5">
          <Flex justify="center" p="3">
            <Text size="2" color="gray">© {year} ASTRO. All rights reserved.</Text>
          </Flex>
        </Container>
      </footer>
    </Box>
  );
}
