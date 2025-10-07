// src/pages/LearnPage.jsx

import React from 'react';
import { Container, Heading, Text, Card, Flex, Separator, Grid, Badge, Table, Callout } from '@radix-ui/themes';
import { LightningBoltIcon, PieChartIcon, MagnifyingGlassIcon, TargetIcon, InfoCircledIcon } from '@radix-ui/react-icons';

export default function LearnPage() {
  return (
    <Container size="4" py="6">
      <Flex direction="column" gap="6">
        {/* Header */}
        <Flex direction="column" gap="3">
          <Heading size="7">
            How Your Nutrition is Calculated
          </Heading>
          <Text size="3" color="gray">
            Understanding the science behind your personalized nutrition recommendations
          </Text>
        </Flex>

        {/* Banner */}
        <Callout.Root>
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <strong>Evidence-Based Recommendations:</strong> All calculations are based on USDA Dietary Guidelines, 
            peer-reviewed research, and population data defined by age and sex. These are general recommendations - 
            consult a healthcare professional for personalized nutrition advice.
          </Callout.Text>
        </Callout.Root>

        <Grid columns={{ initial: '1', lg: '2' }} gap="5">
          {/* Hydration */}
          <Card size="3" variant="surface">
            <Flex direction="column" gap="4">
              <Heading size="5">
                <TargetIcon /> Water
              </Heading>
              <Separator />
              <Flex direction="column" gap="3">
                <div>
                  <Text size="3" weight="bold" mb="2">Base Water Intake</Text>
                  <Text>Calculated based on body weight and activity level:</Text>
                  <Card variant="surface" mt="2" p="2">
                    <Text family="mono" size="2">Water (mL) = Body Weight (kg) × 40 × Activity Multiplier</Text>
                  </Card>
                </div>

                <div>
                  <Text size="3" weight="bold" mb="2">Activity Multipliers</Text>
                  <Flex direction="column" gap="1" mt="2">
                    <Text size="2">• <Badge>Sedentary</Badge> × 0.9</Text>
                    <Text size="2">• <Badge>Light</Badge> × 1.0</Text>
                    <Text size="2">• <Badge>Moderate</Badge> × 1.1</Text>
                    <Text size="2">• <Badge>Active</Badge> × 1.2</Text>
                    <Text size="2">• <Badge>Very Active</Badge> × 1.4</Text>
                  </Flex>
                </div>
              </Flex>
            </Flex>
          </Card>

          {/* Energy Calculation */}
          <Card size="3" variant="surface">
            <Flex direction="column" gap="4">
              <Heading size="5">
                <LightningBoltIcon /> Daily Energy
              </Heading>
              <Separator />
              <Flex direction="column" gap="3">
                <div>
                  <Text size="3" weight="bold" mb="2">Basal Metabolic Rate (BMR)</Text>
                  <Text>The calories your body burns at rest. We use the Mifflin-St Jeor equation:</Text>
                  <Card variant="surface" mt="2" p="3">
                    <Text family="mono" size="2">
                      <strong>Men:</strong> 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5<br/>
                      <strong>Women:</strong> 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
                    </Text>
                  </Card>
                </div>
                
                <div>
                  <Text size="3" weight="bold" mb="2">Total Daily Energy Expenditure (TDEE)</Text>
                  <Text>BMR multiplied by your activity level:</Text>
                  <Flex direction="column" gap="1" mt="2">
                    <Text size="2">• <Badge>Sedentary</Badge> (0-60 min/week): BMR × 1.2</Text>
                    <Text size="2">• <Badge>Light</Badge> (61-150 min/week): BMR × 1.375</Text>
                    <Text size="2">• <Badge>Moderate</Badge> (151-300 min/week): BMR × 1.55</Text>
                    <Text size="2">• <Badge>Active</Badge> (301-420 min/week): BMR × 1.725</Text>
                    <Text size="2">• <Badge>Very Active</Badge> (420+ min/week): BMR × 1.9</Text>
                  </Flex>
                </div>

                <div>
                  <Text size="3" weight="bold" mb="2">Goal Adjustments</Text>
                  <Text>We adjust your TDEE based on your weight goal:</Text>
                  <Flex direction="column" gap="1" mt="2">
                    <Text size="2">• <Badge>Fast Loss</Badge> TDEE - 500 calories (≈1 lb/week)</Text>
                    <Text size="2">• <Badge>Progressive Loss</Badge> TDEE - 250 calories (≈0.5 lb/week)</Text>
                    <Text size="2">• <Badge>Maintain</Badge> TDEE (no change)</Text>
                    <Text size="2">• <Badge>Progressive Gain</Badge> TDEE + 250 calories</Text>
                    <Text size="2">• <Badge>Fast Gain</Badge> TDEE + 500 calories</Text>
                  </Flex>
                </div>
              </Flex>
            </Flex>
          </Card>


          {/* Macronutrients */}
          <Card size="3" variant="surface">
            <Flex direction="column" gap="4">
              <Heading size="5">
                <PieChartIcon /> Macronutrients
              </Heading>
              <Separator />
              <Flex direction="column" gap="3">
                <div>
                  <Text size="3" weight="bold" mb="2">Protein</Text>
                  <Text>Percentage varies by weight goal to preserve muscle mass:</Text>
                  <Flex direction="column" gap="1" mt="2">
                    <Text size="2">• <Badge>Fast Loss:</Badge> 40% of calories</Text>
                    <Text size="2">• <Badge>Progressive Loss:</Badge> 35% of calories</Text>
                    <Text size="2">• <Badge>Maintain/Gain:</Badge> 30% of calories</Text>
                  </Flex>
                  <Card variant="surface" mt="2" p="2">
                    <Text family="mono" size="2">Protein (g) = (Total Calories × Percentage) ÷ 4</Text>
                  </Card>
                </div>

                <div>
                  <Text size="3" weight="bold" mb="2">Fat</Text>
                  <Text>Based on activity level for optimal hormone production:</Text>
                  <Flex direction="column" gap="1" mt="2">
                    <Text size="2">• <Badge>Sedentary:</Badge> 20% of calories</Text>
                    <Text size="2">• <Badge>Light-Moderate:</Badge> 25% of calories</Text>
                    <Text size="2">• <Badge>Active-Very Active:</Badge> 30% of calories</Text>
                  </Flex>
                  <Card variant="surface" mt="2" p="2">
                    <Text family="mono" size="2">Fat (g) = (Total Calories × Percentage) ÷ 9</Text>
                  </Card>
                  
                  <Text size="3" weight="bold" mb="2" mt="3">Fat Subtypes</Text>
                  <Text>Calculated as percentages of total fat intake:</Text>
                  <Flex direction="column" gap="1" mt="2">
                    <Text size="2">• <Badge>Saturated Fat:</Badge> 16% of total fat</Text>
                    <Text size="2">• <Badge>Polyunsaturated Fat:</Badge> 30% of total fat</Text>
                    <Text size="2">• <Badge>Monounsaturated Fat:</Badge> Remainder (54%)</Text>
                    <Text size="2">• <Badge>Trans Fat:</Badge> 0g (avoided)</Text>
                  </Flex>
                </div>

                <div>
                  <Text size="3" weight="bold" mb="2">Carbohydrates</Text>
                  <Text>Fills remaining calories after protein and fat allocation:</Text>
                  <Card variant="surface" mt="2" p="2">
                    <Text family="mono" size="2">Carbs (g) = (Total Calories - Protein Calories - Fat Calories) ÷ 4</Text>
                  </Card>
                  
                  <Text size="3" weight="bold" mb="2" mt="3">Carbohydrate Subtypes</Text>
                  <Text>Estimated based on total calorie intake:</Text>
                  <Flex direction="column" gap="1" mt="2">
                    <Text size="2">• <Badge>Sugar:</Badge> (Calories ÷ 1000) × 10g</Text>
                    <Text size="2">• <Badge>Fiber:</Badge> (Calories ÷ 1000) × 14g</Text>
                    <Text size="2">• <Badge>Starch:</Badge> Total Carbs - Sugar - Fiber</Text>
                  </Flex>
                </div>
              </Flex>
            </Flex>
          </Card>

          {/* Micronutrients */}
          <Card size="3" variant="surface">
            <Flex direction="column" gap="4">
              <Heading size="5">
                <MagnifyingGlassIcon /> Micronutrients
              </Heading>
              <Separator />
              <Flex direction="column" gap="3">                
                <Table.Root size="2">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Men</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Women</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell>Vitamin A</Table.Cell>
                      <Table.Cell>900 μg</Table.Cell>
                      <Table.Cell>700 μg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Vitamin B6</Table.Cell>
                      <Table.Cell>1.3 mg</Table.Cell>
                      <Table.Cell>1.3 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Vitamin B12</Table.Cell>
                      <Table.Cell>2.4 μg</Table.Cell>
                      <Table.Cell>2.4 μg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Vitamin C</Table.Cell>
                      <Table.Cell>90 mg</Table.Cell>
                      <Table.Cell>75 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Vitamin D</Table.Cell>
                      <Table.Cell>15 μg</Table.Cell>
                      <Table.Cell>15 μg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Vitamin E</Table.Cell>
                      <Table.Cell>15 mg</Table.Cell>
                      <Table.Cell>15 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Vitamin K</Table.Cell>
                      <Table.Cell>120 μg</Table.Cell>
                      <Table.Cell>90 μg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Calcium</Table.Cell>
                      <Table.Cell>1000 mg</Table.Cell>
                      <Table.Cell>1000 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Copper</Table.Cell>
                      <Table.Cell>0.9 mg</Table.Cell>
                      <Table.Cell>0.9 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Iron</Table.Cell>
                      <Table.Cell>8 mg</Table.Cell>
                      <Table.Cell>18 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Magnesium</Table.Cell>
                      <Table.Cell>400 mg</Table.Cell>
                      <Table.Cell>310 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Manganese</Table.Cell>
                      <Table.Cell>2.3 mg</Table.Cell>
                      <Table.Cell>1.8 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Phosphorus</Table.Cell>
                      <Table.Cell>700 mg</Table.Cell>
                      <Table.Cell>700 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Potassium</Table.Cell>
                      <Table.Cell>3400 mg</Table.Cell>
                      <Table.Cell>2600 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Selenium</Table.Cell>
                      <Table.Cell>55 μg</Table.Cell>
                      <Table.Cell>55 μg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Sodium</Table.Cell>
                      <Table.Cell>1500 mg</Table.Cell>
                      <Table.Cell>1500 mg</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell>Zinc</Table.Cell>
                      <Table.Cell>11 mg</Table.Cell>
                      <Table.Cell>8 mg</Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table.Root>

                <div>
                  <Text size="3" weight="bold" mb="2">Age-Based Adjustments</Text>
                  <Flex direction="column" gap="1" mt="2">
                    <Text size="2">• <Badge>18-30 years:</Badge> Base values shown above</Text>
                    <Text size="2">• <Badge>31-50 years:</Badge> Slight increases for some nutrients</Text>
                    <Text size="2">• <Badge>51+ years:</Badge> Higher Calcium (1200mg), Vitamin D (20μg)</Text>
                    <Text size="2">• <Badge>Pregnancy & Lactation:</Badge> Increased needs for most vitamins and minerals</Text>
                  </Flex>
                </div>

                <Text size="2" color="gray">
                  <Badge variant="outline">Note:</Badge> Values are automatically calculated based on your profile. 
                  Individual needs may vary based on health conditions, medications, and lifestyle factors.
                </Text>
              </Flex>
            </Flex>
          </Card>
        </Grid>
      </Flex>
    </Container>
  );
}