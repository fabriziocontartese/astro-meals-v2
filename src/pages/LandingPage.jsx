// src/pages/LandingPage.jsx
// High-level: Marketing landing page. Hero + features + call-to-action linking to profile demo and app demo.

import { Link } from "react-router-dom";
import {
  Box, Button, Container, Flex, Grid, Heading, Text, Separator,
} from "@radix-ui/themes";
import { EyeOpenIcon, TargetIcon, ReaderIcon, CalendarIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import { Feature } from "../components/ui/Feature";

export default function LandingPage() {
  return (
    <>
      {/* Hero: headline and value prop */}
      <Box asChild className="hero-section">
        <section>
          <Container size="4" px="4" py="4">
            <Flex direction="column" align="center" gap="6">
              <Heading size="9" align="center">Automate Your Nutrition</Heading>
              <Text size="4" align="center" color="gray">
                ASTRO builds custom meal schedules that will save you time and money.<br />
                A perfect diet, on autopilot.
              </Text>
            </Flex>
          </Container>
        </section>
      </Box>

      {/* Features: four key capabilities */}
      <Box asChild className="features-section">
        <section>
          <Container size="4" px="4" py="4">
            <Grid columns={{ initial: "1", sm: "2", md: "4" }} gap="4">
              <Feature icon={<TargetIcon />} title="Personalized Nutrition" desc="Create a plan tailored to your health and goals." />
              <Feature icon={<ReaderIcon />} title="Recipe Library" desc="Use your own recipes and discover new ones." />
              <Feature icon={<CalendarIcon />} title="Smart Scheduling" desc="Drag and drop meals into your weekly plan." />
              <Feature icon={<LightningBoltIcon />} title="Quick Export" desc="Create grocery lists in one click." />
            </Grid>
          </Container>
        </section>
      </Box>

      {/* CTA: start flow or view demo */}
      <Box asChild className="cta-section">
        <section>
          <Container size="4" px="4" py="4">
            <Flex direction="column" align="center" gap="3">
              <Heading align="center">Ready to level up your routine?</Heading>
              <Flex gap="3" wrap="wrap" mt="3">
                {/* Primary action: routes to a demo-filled profile */}
                <Button size="3" variant="solid" asChild>
                  <Link to="/profile?demo=1">Get Started</Link>
                </Button>
                {/* Secondary action: routes to demo page */}
                <Button size="3" variant="soft" asChild>
                  <Link to="/demo"><EyeOpenIcon /> See Demo</Link>
                </Button>
              </Flex>
            </Flex>
          </Container>
        </section>
      </Box>

    </>
  );
}
