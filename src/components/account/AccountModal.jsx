// filepath: /src/components/account/AccountModal.jsx
import { useEffect, useState } from "react";
import {
  Dialog, Grid, Flex, Button, Text, TextField, Select, Checkbox, Separator, Callout
} from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { loadProfileInputs, upsertProfileBasic } from "../../api/profile.js";
import { supabase } from "../../auth/supabaseClient.js"; // fallback for signOut

const UNSPEC = "unspecified";

/* Alphabetical: OECD + major LatAm + hubs */
const COUNTRY_OPTIONS = [
  "Argentina","Australia","Austria","Belgium","Bolivia","Brazil","Canada","Chile","China",
  "Colombia","Costa Rica","Cuba","Czech Republic","Denmark","Dominican Republic","Ecuador",
  "Egypt","El Salvador","Estonia","Finland","France","Germany","Greece","Guatemala",
  "Hong Kong","Hungary","Iceland","India","Indonesia","Ireland","Israel","Italy","Japan",
  "Kenya","Korea","Latvia","Lithuania","Luxembourg","Malaysia","Mexico","Morocco",
  "Netherlands","New Zealand","Nigeria","Norway","Panama","Paraguay","Peru","Philippines",
  "Poland","Portugal","Qatar","Saudi Arabia","Singapore","Slovakia","Slovenia","South Africa",
  "Spain","Sweden","Switzerland","Taiwan","Thailand","Turkey","United Arab Emirates",
  "United Kingdom","United States","Uruguay","Venezuela","Vietnam","Other"
];

const ETHNICITY_OPTIONS = [
  "White","Black","Asian","Latino","Other / Prefer not to say"
];

const LANG_OPTIONS = ["English"];
const NOTIFY_KEYS = ["daily_plan","weekly_plan","monthly_plan","promotional"];

const normLoad = (v) => (v == null || v === "" ? UNSPEC : v);
const normSave = (v) => (v === UNSPEC ? null : v);

export default function AccountModal({ open, onOpenChange }) {
  const { user, signOut } = useAuth();
  const [form, setForm] = useState({
    first_name: "", last_name: "",
    sex: UNSPEC, birth_date: "",
    country_of_origin: UNSPEC, country_of_residence: UNSPEC,
    ethnicity: UNSPEC, language: "English",
    notifications: []
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      setErr("");
      try {
        const { profile: p } = await loadProfileInputs(user.id);
        setForm({
          first_name: p?.name || "",
          last_name: p?.surname || "",
          sex: normLoad(p?.sex),
          // ensure YYYY-MM-DD for <input type="date">
          birth_date: p?.birth_date ? String(p.birth_date).slice(0, 10) : "",
          country_of_origin: normLoad(p?.country_of_origin),
          country_of_residence: normLoad(p?.country_of_residence),
          ethnicity: normLoad(p?.ethnicity),
          language: p?.language || "English",
          notifications: Array.isArray(p?.notifications) ? p.notifications : []
        });
      } catch (e) {
        setErr(e?.message || String(e));
      }
    })();
  }, [open, user?.id]);

  const toggleNotify = (key) => {
    setForm((f) => {
      const has = f.notifications.includes(key);
      return { ...f, notifications: has ? f.notifications.filter(k => k !== key) : [...f.notifications, key] };
    });
  };

  const onSave = async () => {
    if (!user?.id) return;
    setSaving(true); setErr("");
    try {
      await upsertProfileBasic(user.id, {
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        sex: normSave(form.sex),
        birth_date: form.birth_date || null,
        country_of_origin: normSave(form.country_of_origin),
        country_of_residence: normSave(form.country_of_residence),
        ethnicity: normSave(form.ethnicity),
        language: form.language || "English",
        notifications: form.notifications
      });
      onOpenChange(false);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    try {
      if (typeof signOut === "function") await signOut();
      else if (supabase?.auth?.signOut) await supabase.auth.signOut();
    } finally {
      onOpenChange(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        maxWidth="640px"
        style={{ position: "relative", paddingTop: 48 }}
      >
        <Button
          color="red"
          variant="solid"
          onClick={onLogout}
          style={{ position: "absolute", top: 12, right: 12 }}
        >
          Log out
        </Button>

        <Dialog.Title>Account</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          Manage personal details and notifications.
        </Dialog.Description>

        {err && (
          <Callout.Root color="red" mt="3" mb="2">
            <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
            <Callout.Text>{err}</Callout.Text>
          </Callout.Root>
        )}

        <Grid columns={{ initial: "1", sm: "2" }} gap="4" mt="4">
          <div>
            <Text size="2">Name</Text>
            <TextField.Root
              value={form.first_name}
              onChange={(e)=>setForm(f=>({ ...f, first_name: e.target.value }))}
              placeholder="First name"
            />
          </div>
          
          <div>
            <Text size="2">Surname</Text>
            <TextField.Root
              value={form.last_name}
              onChange={(e)=>setForm(f=>({ ...f, last_name: e.target.value }))}
              placeholder="Last name"
            />
          </div>

          <div>
            <Text size="2">Sex</Text>
            <Select.Root value={form.sex} onValueChange={(v)=>setForm(f=>({ ...f, sex: v }))}>
              <Select.Trigger placeholder="Select" />
              <Select.Content>
                <Select.Item value={UNSPEC}>Prefer not to say</Select.Item>
                <Select.Item value="male">Male</Select.Item>
                <Select.Item value="female">Female</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>

          <div>
            <Text size="2">Date of birth</Text>
            <TextField.Root
              type="date"
              value={form.birth_date}
              onChange={(e)=>setForm(f=>({ ...f, birth_date: e.target.value }))}
            />
          </div>

          <div>
            <Text size="2">Country of origin</Text>
            <Select.Root value={form.country_of_origin} onValueChange={(v)=>setForm(f=>({ ...f, country_of_origin: v }))}>
              <Select.Trigger placeholder="Select" />
              <Select.Content>
                <Select.Item value={UNSPEC}>Prefer not to say</Select.Item>
                {COUNTRY_OPTIONS.map(c => <Select.Item key={c} value={c}>{c}</Select.Item>)}
              </Select.Content>
            </Select.Root>
          </div>

          <div>
            <Text size="2">Country of residence</Text>
            <Select.Root value={form.country_of_residence} onValueChange={(v)=>setForm(f=>({ ...f, country_of_residence: v }))}>
              <Select.Trigger placeholder="Select" />
              <Select.Content>
                <Select.Item value={UNSPEC}>Prefer not to say</Select.Item>
                {COUNTRY_OPTIONS.map(c => <Select.Item key={c} value={c}>{c}</Select.Item>)}
              </Select.Content>
            </Select.Root>
          </div>

          <div>
            <Text size="2">Ethnicity</Text>
            <Select.Root value={form.ethnicity} onValueChange={(v)=>setForm(f=>({ ...f, ethnicity: v }))}>
              <Select.Trigger placeholder="Select" />
              <Select.Content>
                <Select.Item value={UNSPEC}>Other / Prefer not to say</Select.Item>
                {ETHNICITY_OPTIONS.filter(e => e !== "Other / Prefer not to say").map(c => (
                  <Select.Item key={c} value={c}>{c}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>

          <div>
            <Text size="2">Language</Text>
            <Select.Root value={form.language} onValueChange={(v)=>setForm(f=>({ ...f, language: v }))}>
              <Select.Trigger placeholder="Select" />
              <Select.Content>
                {LANG_OPTIONS.map(c => <Select.Item key={c} value={c}>{c}</Select.Item>)}
              </Select.Content>
            </Select.Root>
          </div>
        </Grid>

        <Separator my="4" />

        <div>
          <Text size="2" weight="medium">Notification settings</Text>
          <Flex direction="column" gap="2" mt="2">
            {NOTIFY_KEYS.map(k => (
              <label key={k}>
                <Checkbox
                  checked={form.notifications.includes(k)}
                  onCheckedChange={()=>toggleNotify(k)}
                />{" "}
                {k.replace("_"," ").replace("_"," ")}
              </label>
            ))}
          </Flex>
        </div>

        <Flex gap="3" mt="4" justify="end">
          <Button variant="soft" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
