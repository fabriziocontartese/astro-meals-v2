// Present a Google-only OAuth login button with basic error and loading states.

import { useState } from "react";
import { Button, Card, Flex, Callout } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useAuth } from "../../auth/hooks/useAuth.js";

export default function LoginForm() {
  const { signInWithGoogle } = useAuth(); // auth hook: exposes Google sign-in
  const [loading, setLoading] = useState(false); // UI spinner/disable flag
  const [error, setError] = useState(""); // error message for Callout

  // Start Google OAuth, surface errors, lock UI while pending
  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e.message || String(e));
      setLoading(false);
    }
  };

  return (
    <Card size="3">
      {/* Inline error banner */}
      {error && (
        <Callout.Root color="red" mb="3">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {/* Single-provider login button */}
      <Flex direction="column" gap="3">
        <Button
          size="3"
          onClick={handleGoogle}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          {/* Provider icon */}
          <img
            src="https://msutemmnckhpwnwrwvrl.supabase.co/storage/v1/object/public/website-images/oauth-icons/google-icon.png"
            alt="Google"
            width="20"
            height="20"
            style={{ display: "block" }}
          />
          {loading ? "Working…" : "Continue with Google"}
        </Button>
      </Flex>
    </Card>
  );
}
