// src/components/plan/edit/PlanEditNutrition.jsx
import React, { useMemo } from "react";
import { Card, Text, Flex, Grid, Badge } from "@radix-ui/themes";
import { CheckCircledIcon, ArrowUpIcon, ArrowDownIcon } from "@radix-ui/react-icons";
import { deriveProfileSummary } from "../../../utils/profileFormulas";

// ---------- helpers ----------
const ratio = (v, t) => {
  const V = Number(v) || 0;
  const T = Number(t) || 0;
  if (T <= 0) return null;
  return (V - T) / T;
};
const iconFor = (v, t) => {
  const r = ratio(v, t);
  if (r == null) return null;
  if (Math.abs(r) <= 0.05) return <CheckCircledIcon aria-label="on target" />;
  if (r > 0.05) return <ArrowUpIcon aria-label="above target" />;
  return <ArrowDownIcon aria-label="below target" />;
};
const fmt = (v, u = "") => (v == null || Number.isNaN(Number(v)) ? "—" : `${Math.round(Number(v))}${u}`);

function getRecipeNutrition(recipe_id) {
  const list = Array.isArray(window.__recipes) ? window.__recipes : [];
  const r = list.find((x) => String(x.recipe_id) === String(recipe_id));
  return r?.nutrition || r?.macros || null;
}

function aggregatePlan(plan) {
  const weeks = plan?.plan_recipes?.weeks || {};
  const acc = {
    kcal: 0, water_ml: 0,
    protein_g: 0,
    carbs_g: 0, carbs_starch_g: 0, carbs_fiber_g: 0, carbs_other_g: 0, carbs_sugar_g: 0,
    fat_g: 0, fat_saturated_g: 0, fat_mono_g: 0, fat_poly_g: 0, fat_trans_g: 0,
    vitA_mcg: 0, B1_mg: 0, B2_mg: 0, B3_mg: 0, B5_mg: 0, B6_mg: 0, B9_mcg: 0, B12_mcg: 0,
    vitC_mg: 0, vitD_mcg: 0, vitE_mg: 0, vitK_mcg: 0,
    calcium_mg: 0, copper_mg: 0, iron_mg: 0, magnesium_mg: 0, manganese_mg: 0,
    phosphorus_mg: 0, potassium_mg: 0, selenium_mcg: 0, sodium_mg: 0, zinc_mg: 0,
  };
  const days = Object.values(weeks).flatMap((byDay) => Object.values(byDay || {}));
  for (const meals of days) {
    for (const m of meals || []) {
      const n = m?.nutrition || getRecipeNutrition(m?.recipe_id);
      if (!n) continue;

      acc.kcal += Number(n.kcal || 0);
      acc.water_ml += Number(n.water_ml || 0);

      acc.protein_g += Number(n.protein_g ?? n.macro_protein_total ?? 0);

      acc.carbs_g += Number(n.carbs_g ?? n.macro_carb_total ?? 0);
      acc.carbs_starch_g += Number(n.carbs_starch_g ?? n.macro_carb_starch ?? 0);
      acc.carbs_fiber_g += Number(n.carbs_fiber_g ?? n.macro_carb_fiber ?? 0);
      acc.carbs_other_g += Number(n.carbs_other_g ?? n.macro_carb_other ?? 0);
      acc.carbs_sugar_g += Number(n.carbs_sugar_g ?? n.macro_carb_sugar ?? 0);

      acc.fat_g += Number(n.fat_g ?? n.macro_fat_total ?? 0);
      acc.fat_saturated_g += Number(n.fat_saturated_g ?? n.macro_fat_saturated ?? 0);
      acc.fat_mono_g += Number(n.fat_mono_g ?? n.macro_fat_monosaturated ?? 0);
      acc.fat_poly_g += Number(n.fat_poly_g ?? n.macro_fat_polyunsaturated ?? 0);
      acc.fat_trans_g += Number(n.fat_trans_g ?? n.macro_fat_trans ?? 0);

      acc.vitA_mcg += Number(n.vitA_mcg ?? n.micro_vitA ?? 0);
      acc.B1_mg += Number(n.B1_mg ?? n.micro_vitB1 ?? 0);
      acc.B2_mg += Number(n.B2_mg ?? n.micro_vitB2 ?? 0);
      acc.B3_mg += Number(n.B3_mg ?? n.micro_vitB3 ?? 0);
      acc.B5_mg += Number(n.B5_mg ?? n.micro_vitB5 ?? 0);
      acc.B6_mg += Number(n.B6_mg ?? n.micro_B6 ?? 0);
      acc.B9_mcg += Number(n.B9_mcg ?? n.micro_vitB9 ?? 0);
      acc.B12_mcg += Number(n.B12_mcg ?? n.micro_B12 ?? 0);
      acc.vitC_mg += Number(n.vitC_mg ?? n.micro_vitC ?? 0);
      acc.vitD_mcg += Number(n.vitD_mcg ?? n.micro_vitD ?? 0);
      acc.vitE_mg += Number(n.vitE_mg ?? n.micro_vitE ?? 0);
      acc.vitK_mcg += Number(n.vitK_mcg ?? n.micro_vitK ?? 0);

      acc.calcium_mg += Number(n.calcium_mg ?? n.micro_calcium ?? 0);
      acc.copper_mg += Number(n.copper_mg ?? n.micro_copper ?? 0);
      acc.iron_mg += Number(n.iron_mg ?? n.micro_iron ?? 0);
      acc.magnesium_mg += Number(n.magnesium_mg ?? n.micro_magnesium ?? 0);
      acc.manganese_mg += Number(n.manganese_mg ?? n.micro_manganese ?? 0);
      acc.phosphorus_mg += Number(n.phosphorus_mg ?? n.micro_phosphorus ?? 0);
      acc.potassium_mg += Number(n.potassium_mg ?? n.micro_potassium ?? 0);
      acc.selenium_mcg += Number(n.selenium_mcg ?? n.micro_selenium ?? 0);
      acc.sodium_mg += Number(n.sodium_mg ?? n.micro_sodium ?? 0);
      acc.zinc_mg += Number(n.zinc_mg ?? n.micro_zinc ?? 0);
    }
  }
  return acc;
}

function Row({ label, value, target, unit }) {
  const icon = iconFor(value, target);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 8 }}>
      <Text size="2">{label}</Text>
      <Text size="2" color="gray">{fmt(value, unit)} / {fmt(target, unit)}</Text>
      <div style={{ width: 18, display: "grid", placeItems: "center" }}>
        {icon || <span style={{ color: "var(--gray-8)" }}>—</span>}
      </div>
    </div>
  );
}

// ---------- component ----------
export default function PlanEditNutrition({ plan, profileSummary }) {
  const days = Math.max(1, Number(plan?.length_days || 1));

  const summary = useMemo(() => {
    if (profileSummary) return profileSummary;
    try {
      const rows = window.__profileBundle || null;
      if (rows?.profile || rows?.goals || rows?.energy) {
        return deriveProfileSummary({
          profileRow: rows.profile ?? undefined,
          goalsRow: rows.goals ?? undefined,
          energyRow: rows.energy ?? undefined,
        });
      }
    } catch {
      // none
    }
    return window.__profileSummary || null;
  }, [profileSummary]);

  const totals = useMemo(() => aggregatePlan(plan), [plan]);
  const perDay = useMemo(() => {
    const d = days || 1;
    const out = {};
    Object.keys(totals).forEach((k) => (out[k] = (Number(totals[k]) || 0) / d));
    return out;
  }, [totals, days]);

  // targets
  const bmr = summary?.bmr_kcal ?? null;
  const tdee = summary?.tdee_kcal ?? null;
  const kcalTarget = summary?.recommended_kcal ?? tdee ?? null;
  const activityTarget = tdee != null && bmr != null ? Math.max(0, tdee - bmr) : null;
  const activityValue = bmr != null ? Math.max(0, (perDay.kcal || 0) - bmr) : null;
  const macros = summary?.macros || {};
  const waterT = summary?.water_ml ?? null;

  return (
    <Card variant="surface" style={{ padding: 12 }}>
      <Flex justify="between" align="center" mb="1">
        <Text size="3" weight="medium">Plan Nutrition Tracker</Text>
        <Badge variant="soft" color="gray">Per-day</Badge>
      </Flex>

      {/* 3 columns: Energy | Macros | Vitamins & Minerals */}
      <Grid columns={{ initial: "1", md: "3" }} gap="3" align="start">
        {/* ENERGY */}
        <Card variant="ghost" style={{ padding: 10 }}>
          <Text size="2" color="gray">Energy</Text>
          <div style={{ height: 6 }} />
          <div style={{ display: "grid", gap: 8 }}>
            <Row label="BMR" value={perDay.kcal} target={bmr} unit=" kcal" />
            <Row label="Activity" value={activityValue} target={activityTarget} unit=" kcal" />
            <Row label="Goal" value={perDay.kcal} target={kcalTarget} unit=" kcal" />
          </div>
        </Card>

        {/* MACROS (incl. water) */}
        <Card variant="ghost" style={{ padding: 10 }}>
          <Text size="2" color="gray">Macros</Text>
          <div style={{ height: 6 }} />
          <div style={{ display: "grid", gap: 8 }}>
            <Row label="Water" value={perDay.water_ml} target={waterT} unit=" ml" />
            <Row label="Protein" value={perDay.protein_g} target={macros.protein_g ?? macros.macro_protein_total} unit=" g" />
            <Row label="Carb" value={perDay.carbs_g} target={macros.carbs_g ?? macros.macro_carb_total} unit=" g" />
            <div style={{ paddingLeft: 10, display: "grid", gap: 6 }}>
              <Row label="Starch" value={perDay.carbs_starch_g} target={macros.carbs_starch_g ?? macros.macro_carb_starch} unit=" g" />
              <Row label="Fiber" value={perDay.carbs_fiber_g} target={macros.carbs_fiber_g ?? macros.macro_carb_fiber} unit=" g" />
              <Row label="Other Carbs" value={perDay.carbs_other_g} target={macros.carbs_other_g ?? macros.macro_carb_other} unit=" g" />
              <Row label="Sugar" value={perDay.carbs_sugar_g} target={macros.carbs_sugar_g ?? macros.macro_carb_sugar} unit=" g" />
            </div>
            <Row label="Fat" value={perDay.fat_g} target={macros.fat_g ?? macros.macro_fat_total} unit=" g" />
            <div style={{ paddingLeft: 10, display: "grid", gap: 6 }}>
              <Row label="Saturated" value={perDay.fat_saturated_g} target={macros.fat_saturated_g ?? macros.macro_fat_saturated} unit=" g" />
              <Row label="Monounsaturated" value={perDay.fat_mono_g} target={macros.fat_monosaturated_g ?? macros.macro_fat_monosaturated} unit=" g" />
              <Row label="Polyunsaturated" value={perDay.fat_poly_g} target={macros.fat_polyunsaturated_g ?? macros.macro_fat_polyunsaturated} unit=" g" />
              <Row label="Trans" value={perDay.fat_trans_g} target={macros.fat_trans_g ?? macros.macro_fat_trans} unit=" g" />
            </div>
          </div>
        </Card>

        {/* VITAMINS & MINERALS (2 inner columns) */}
        <Card variant="ghost" style={{ padding: 10 }}>
          <Flex justify="between" align="center" mb="1">
            <Text size="2" color="gray">Vitamins & Minerals</Text>
            <Badge variant="soft" color="gray">goals_v1</Badge>
          </Flex>

          <Grid columns={{ initial: "1", sm: "2" }} gap="2">
            {/* Left column */}
            <div style={{ display: "grid", gap: 6 }}>
              <Row label="Vit A" value={perDay.vitA_mcg} target={summary?.micros?.vitA_mcg} unit=" μg" />
              <Row label="B1" value={perDay.B1_mg} target={summary?.micros?.B1_mg} unit=" mg" />
              <Row label="B2" value={perDay.B2_mg} target={summary?.micros?.B2_mg} unit=" mg" />
              <Row label="B3" value={perDay.B3_mg} target={summary?.micros?.B3_mg} unit=" mg" />
              <Row label="B5" value={perDay.B5_mg} target={summary?.micros?.B5_mg} unit=" mg" />
              <Row label="B6" value={perDay.B6_mg} target={summary?.micros?.B6_mg} unit=" mg" />
              <Row label="B9" value={perDay.B9_mcg} target={summary?.micros?.B9_mcg} unit=" μg" />
              <Row label="B12" value={perDay.B12_mcg} target={summary?.micros?.B12_mcg} unit=" μg" />
            </div>

            {/* Right column */}
            <div style={{ display: "grid", gap: 6 }}>
              <Row label="Vit C" value={perDay.vitC_mg} target={summary?.micros?.vitC_mg} unit=" mg" />
              <Row label="Vit D" value={perDay.vitD_mcg} target={summary?.micros?.vitD_mcg} unit=" μg" />
              <Row label="Vit E" value={perDay.vitE_mg} target={summary?.micros?.vitE_mg} unit=" mg" />
              <Row label="Vit K" value={perDay.vitK_mcg} target={summary?.micros?.vitK_mcg} unit=" μg" />
              <Row label="Calcium" value={perDay.calcium_mg} target={summary?.micros?.calcium_mg} unit=" mg" />
              <Row label="Copper" value={perDay.copper_mg} target={summary?.micros?.copper_mg} unit=" mg" />
              <Row label="Iron" value={perDay.iron_mg} target={summary?.micros?.iron_mg} unit=" mg" />
              <Row label="Magnesium" value={perDay.magnesium_mg} target={summary?.micros?.magnesium_mg} unit=" mg" />
              <Row label="Manganese" value={perDay.manganese_mg} target={summary?.micros?.manganese_mg} unit=" mg" />
              <Row label="Phosphorus" value={perDay.phosphorus_mg} target={summary?.micros?.phosphorus_mg} unit=" mg" />
              <Row label="Potassium" value={perDay.potassium_mg} target={summary?.micros?.potassium_mg} unit=" mg" />
              <Row label="Selenium" value={perDay.selenium_mcg} target={summary?.micros?.selenium_mcg} unit=" μg" />
              <Row label="Sodium" value={perDay.sodium_mg} target={summary?.micros?.sodium_mg} unit=" mg" />
              <Row label="Zinc" value={perDay.zinc_mg} target={summary?.micros?.zinc_mg} unit=" mg" />
            </div>
          </Grid>
        </Card>
      </Grid>
    </Card>
  );
}
