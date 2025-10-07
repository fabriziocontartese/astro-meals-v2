import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Container, Heading, Text } from "@radix-ui/themes";
import { useAuth } from "../auth/hooks/useAuth.js";
import LoginForm from "../components/auth/OAuthList";

export default function LoginPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && user) navigate("/plan", { replace: true });
  }, [ready, user, navigate]);

  if (!ready) {
    return (
      <Container size="3" py="9" style={{ maxWidth: 420 }}>
        <Text align="center" color="gray">Loading…</Text>
      </Container>
    );
  }

  return (
    <Container size="3" py="9" style={{ maxWidth: 420 }}>
      <Box mb="6" style={{ textAlign: "center" }}>
        <Heading as="h1" size="7" mb="3">
          Welcome to ASTRO Meals
        </Heading>
        <Text size="3" color="gray">
          Create or access your account below
        </Text>
      </Box>
      <LoginForm />
    </Container>
  );
}
