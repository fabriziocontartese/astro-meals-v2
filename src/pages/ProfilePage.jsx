// src/pages/ProfilePage.jsx

// High-level: Profile report page. Loads profile/goals/energy, derives nutrition targets, and lets user edit basic inputs.

import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/hooks/useAuth";
import { fetchUserEnergyRow, upsertUserMetrics } from "../api/goals";
import { loadProfileInputs } from "../api/profile";
import {
  Container, Card, Flex, Grid, Heading, Text, Button, Badge, Callout
} from "@radix-ui/themes";
import { PersonIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import {
  deriveProfileSummary,
  computeAgeFromDOB,
  GOAL_LEVEL_NAMES,
  goalTextFromLevel,
  jobTypeTextFromLevel,
  JOB_TYPE_NAMES,
} from "../utils/profileFormulas";
import { roundIfNumber, toPositiveNumberOrNull, toNonNegativeIntOrNull } from "../utils/numbers.js";
import KeyNumber from "../components/ui/KeyNumber.jsx";
import StatRow from "../components/ui/StatRow.jsx";
import SectionCard from "../components/ui/SectionCard.jsx";

export default function ProfilePage() {
  const { user } = useAuth();

  // Core data bundle: profile rows, goal rows, and cached energy computation.
  const [rows, setRows] = useState({ profile: null, goals: null, energy: null });

  // UI state: loading, edit mode, form values, save state, and last save info.
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    height: "",
    weight: "",
    job_type: "",
    active_time: "",
    weight_goal_level: "3",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaveInfo, setLastSaveInfo] = useState(null);

  // Initial load: fetch profile inputs and energy row for the signed-in user.
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const [bundle, energy] = await Promise.all([
          loadProfileInputs(user.id),
          fetchUserEnergyRow(user.id),
        ]);
        if (!mounted) return;
        const profile = bundle?.profile ?? null;
        const goals = bundle?.goals ?? null;
        setRows({ profile, goals, energy: energy ?? null });
      } catch {
        if (mounted) setRows({ profile: null, goals: null, energy: null });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  // Derived summary: computed age, energy, macro/micro targets, names for UI.
  const summary = deriveProfileSummary({
    profileRow: rows.profile ?? undefined,
    goalsRow: rows.goals ?? undefined,
    energyRow: rows.energy ?? undefined,
  });

  // Readable fields for display and form prefill.
  const sex = rows.profile?.sex ?? null;
  const birth_date = rows.profile?.birth_date ?? "";
  const age = summary?.age ?? (birth_date ? computeAgeFromDOB(birth_date) : null);
  const height = summary?.heightCm ?? null;
  const weight = summary?.weightKg ?? null;
  const job_type = rows.goals?.job_type ?? "sedentary";
  const active_time = rows.goals?.active_time ?? null;
  const storedGoalText = rows.goals?.weight_goal ?? "maintain";
  const inferredLevel = storedGoalText === "lose" ? 2 : storedGoalText === "gain" ? 4 : 3;

  // When entering edit mode or when data arrives, pre-populate the form.
  useEffect(() => {
    if (!editing && (rows.profile || rows.goals)) {
      setForm({
        height: height != null && height > 0 ? String(height) : "",
        weight: weight != null && weight > 0 ? String(weight) : "",
        job_type: job_type != null ? String(job_type) : "",
        active_time: active_time != null ? String(active_time) : "",
        weight_goal_level: String(inferredLevel),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.profile, rows.goals, editing]);

  // Save handler: validate/normalize, upsert metrics, refresh energy, exit edit mode.
  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);

    const level = Number(form.weight_goal_level);
    const job_type = jobTypeTextFromLevel(Number(form.job_type || 1));
    const weight_goal = goalTextFromLevel(level);

    const payload = {
      profile_id: user.id,
      height: toPositiveNumberOrNull(form.height),
      weight: toPositiveNumberOrNull(form.weight),
      job_type,
      active_time: toNonNegativeIntOrNull(form.active_time),
      weight_goal,
    };

    try {
      const res = await upsertUserMetrics(payload);
      const next = {
        profile: { ...(rows.profile ?? {}), profile_id: user.id },
        goals: {
          ...(rows.goals ?? {}),
          profile_id: user.id,
          height: payload.height,
          weight: payload.weight,
          job_type: payload.job_type,
          active_time: payload.active_time,
          weight_goal: payload.weight_goal,
        },
        energy: rows.energy ?? null,
      };
      setRows(next);
      setLastSaveInfo({ payload, response: res, ts: Date.now() });
      try {
        const energyRefreshed = await fetchUserEnergyRow(user.id);
        if (energyRefreshed) setRows((prev) => ({ ...prev, energy: energyRefreshed }));
      } catch (error) {
        console.error("Failed to refresh energy data:", error);
      }
      setEditing(false);
    } catch (e) {
      const msg = e?.message ?? e?.error?.message ?? JSON.stringify(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  // Presentation objects: personal info and daily energy for read mode.
  const personalInfo = {
    Sex: sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : "Complete profile",
    Age: age != null ? `${age} yrs` : "Complete profile",
    Height: height && height > 0 ? `${height} cm` : "Complete profile",
    Weight: weight && weight > 0 ? `${weight} kg` : "Complete profile",
    "Job Type": JOB_TYPE_NAMES[summary?.jobTypeLevel ?? 1] ?? "Complete profile",
    "Weekly Active Time": active_time != null ? `${active_time} min` : "Complete profile",
    "Activity Level": summary?.activityName ?? "Complete profile",
    "Weight Goal": GOAL_LEVEL_NAMES[summary?.goalLevel ?? 1] ?? "Complete profile",
  };

  const dailyValues = {
    BMR: summary?.bmr_kcal != null ? `${roundIfNumber(summary.bmr_kcal)} kcal` : "—",
    TDEE: summary?.tdee_kcal != null ? `${roundIfNumber(summary.tdee_kcal)} kcal` : "—",
    "Recommended kcal": summary?.recommended_kcal != null ? `${summary.recommended_kcal} kcal` : "—",
    Water: summary?.water_ml != null ? `${(summary.water_ml / 1000).toFixed(1)} L` : "—",
  };

  // Macros and micros: grouped structure for display cards.
  const macrosGrouped = summary?.macros
    ? {
        Protein: { total: `${summary.macros.protein_g ?? "—"} g`, subs: [] },
        Carbs: {
          total: `${summary.macros.carbs_g ?? "—"} g`,
          subs: [
            ["Sugar", `${summary.macros.carbs_sugar_g ?? "—"} g`],
            ["Fiber", `${summary.macros.carbs_fiber_g ?? "—"} g`],
            ["Starch", `${summary.macros.carbs_starch_g ?? "—"} g`],
          ],
        },
        Fat: {
          total: `${summary.macros.fat_g ?? "—"} g`,
          subs: [
            ["Saturated", `${summary.macros.fat_saturated_g ?? "—"} g`],
            ["Monounsaturated", `${summary.macros.fat_monosaturated_g ?? "—"} g`],
            ["Polyunsaturated", `${summary.macros.fat_polyunsaturated_g ?? "—"} g`],
            ["Trans", `${summary.macros.fat_trans_g ?? "—"} g`],
          ],
        },
      }
    : null;

  const micros = summary?.micros
    ? [
        ["Vitamin A", `${summary.micros.vitA_mcg ?? "—"} μg`],
        ["Vitamin B6", `${summary.micros.B6_mg ?? "—"} mg`],
        ["Vitamin B12", `${summary.micros.B12_mcg ?? "—"} μg`],
        ["Vitamin C", `${summary.micros.vitC_mg ?? "—"} mg`],
        ["Vitamin D", `${summary.micros.vitD_mcg ?? "—"} μg`],
        ["Vitamin E", `${summary.micros.vitE_mg ?? "—"} mg`],
        ["Vitamin K", `${summary.micros.vitK_mcg ?? "—"} μg`],
        ["Calcium", `${summary.micros.calcium_mg ?? "—"} mg`],
        ["Copper", `${summary.micros.copper_mg ?? "—"} mg`],
        ["Iron", `${summary.micros.iron_mg ?? "—"} mg`],
        ["Magnesium", `${summary.micros.magnesium_mg ?? "—"} mg`],
        ["Manganese", `${summary.micros.manganese_mg ?? "—"} mg`],
        ["Phosphorus", `${summary.micros.phosphorus_mg ?? "—"} mg`],
        ["Potassium", `${summary.micros.potassium_mg ?? "—"} mg`],
        ["Selenium", `${summary.micros.selenium_mcg ?? "—"} μg`],
        ["Sodium", `${summary.micros.sodium_mg ?? "—"} mg`],
        ["Zinc", `${summary.micros.zinc_mg ?? "—"} mg`],
      ]
    : null;

  // Layout: header with edit toggle, error callout, three-column grid, and micronutrients section.
  return (
    <Container size="3" px="4" py="6" style={{ width: "100%", maxWidth: "1120px", marginInline: "auto" }}>
      <Flex justify="between" align="center" mb="3">
        <div>
          <Heading>Profile Report</Heading>
          <Text size="2" color="gray">Based in population data. Not medical advice.</Text>
        </div>
        <Flex align="center" gap="2">
          {!editing ? (
            <Button variant="soft" onClick={() => { setEditing(true); setError(null); }}>
              <PersonIcon style={{ marginRight: 8 }} /> Edit
            </Button>
          ) : (
            <Button variant="soft" onClick={() => { setEditing(false); setError(null); }}>
              Cancel
            </Button>
          )}
        </Flex>
      </Flex>

      {error && (
        <Callout.Root color="red" mb="3">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>{String(error)}</Callout.Text>
        </Callout.Root>
      )}

      {/* Stats grid: body metrics editor/view, daily energy, and macro targets */}
      <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4">
        <SectionCard title="Body Metrics">
          {!editing ? (
            <div>
              {Object.entries(personalInfo).map(([k, v]) => (
                <StatRow key={k} label={k} value={v} />
              ))}
            </div>
          ) : (
            // Simple form: height, weight, job type, activity, and goal level.
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Height (cm)
                <input
                  type="number"
                  step="0.1"
                  value={form.height}
                  onChange={(e) => setForm(f => ({ ...f, height: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                />
              </label>

              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Weight (kg)
                <input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                />
              </label>

              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Job Type
                <select
                  value={form.job_type}
                  onChange={(e) => setForm(f => ({ ...f, job_type: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                >
                  <option value="1">Sedentary</option>
                  <option value="2">Active</option>
                  <option value="3">Very Active</option>
                </select>
              </label>

              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Weekly Active Minutes
                <input
                  type="number"
                  value={form.active_time}
                  onChange={(e) => setForm(f => ({ ...f, active_time: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                />
                <Text size="1" color="gray">Minutes per week</Text>
              </label>

              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Weight Goal
                <select
                  value={form.weight_goal_level}
                  onChange={(e) => setForm(f => ({ ...f, weight_goal_level: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                >
                  <option value="1">Fast Weight Loss</option>
                  <option value="2">Progressive Weight Loss</option>
                  <option value="3">Maintenance</option>
                  <option value="4">Progressive Weight Gain</option>
                  <option value="5">Fast Weight Gain</option>
                </select>
              </label>

              <Flex gap="2" mt="3">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <Button type="button" variant="soft" onClick={() => { setEditing(false); setError(null); }}>Cancel</Button>
              </Flex>

              {lastSaveInfo && (
                <Text size="1" color="gray" style={{ marginTop: 8, display: "block" }}>
                  Last save: {new Date(lastSaveInfo.ts).toLocaleString()}
                </Text>
              )}
            </form>
          )}
        </SectionCard>

        <SectionCard title="Daily Energy">
          <Grid columns={{ initial: "1" }} gap="3">
            <KeyNumber label="Basal Metabolic Rate" value={dailyValues.BMR} />
            <KeyNumber label="Total Daily Energy Expenditure" value={dailyValues.TDEE} />
            <KeyNumber label="Recommended Calories per Day" value={dailyValues["Recommended kcal"]} />
            <KeyNumber label="Recommended Water per Day" value={dailyValues.Water} />
          </Grid>
        </SectionCard>

        <SectionCard title="Macronutrient Targets">
          {!macrosGrouped ? (
            <Text color="gray">Complete profile to compute targets.</Text>
          ) : (
            <Grid columns={{ initial: "1" }} gap="3">
              <Card variant="surface" size="2">
                <Text size="2" weight="medium">Protein</Text>
                <StatRow label="Total" value={macrosGrouped.Protein.total} />
              </Card>
              <Card variant="surface" size="2">
                <Text size="2" weight="medium">Carbs</Text>
                <StatRow label="Total" value={macrosGrouped.Carbs.total} />
                <div style={{ paddingLeft: 8 }}>
                  {macrosGrouped.Carbs.subs.map(([k, v]) => (
                    <StatRow key={k} label={`• ${k}`} value={v} compact />
                  ))}
                </div>
              </Card>
              <Card variant="surface" size="2">
                <Text size="2" weight="medium">Fat</Text>
                <StatRow label="Total" value={macrosGrouped.Fat.total} />
                <div style={{ paddingLeft: 8 }}>
                  {macrosGrouped.Fat.subs.map(([k, v]) => (
                    <StatRow key={k} label={`• ${k}`} value={v} compact />
                  ))}
                </div>
              </Card>
            </Grid>
          )}
        </SectionCard>
      </Grid>

      {/* Micronutrients list split into two responsive columns */}
      <br></br>
      <SectionCard title="Micronutrients" right={<Badge variant="soft" color="gray">From goals_v1</Badge>}>
        {!micros ? (
          <Text color="gray">Complete profile to compute micronutrients.</Text>
        ) : (
          <div className="micros-grid" style={{ display:"grid", gridTemplateColumns:"1fr", gap:12 }}>
            <style>{`@media (min-width: 768px){ .micros-grid{ grid-template-columns:1fr 1fr; column-gap:16px; } }`}</style>
            <div>{micros.slice(0, Math.ceil(micros.length/2)).map(([k,v]) => (<StatRow key={k} label={k} value={v} />))}</div>
            <div>{micros.slice(Math.ceil(micros.length/2)).map(([k,v]) => (<StatRow key={k} label={k} value={v} />))}</div>
          </div>
        )}
      </SectionCard>

      {/* Footer status messages */}
      {loading && (<Flex mt="3" align="center" gap="2"><InfoCircledIcon /> <Text color="gray">Loading…</Text></Flex>)}
      {!loading && !rows.profile && !rows.goals && (<Text color="gray" mt="3">No metrics available — complete your measurements to generate a full report.</Text>)}
    </Container>
  );
}
