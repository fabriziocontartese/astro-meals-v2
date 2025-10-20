// src/pages/PlanPage.jsx

// High-level: Plans hub. Loads user plans, picks current plan, and switches between view, edit, and create modes.
// Routing: /plan/:userId/:planId
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container } from "@radix-ui/themes";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../auth/supabaseClient.js";
import PlanView from "../components/plan/view/PlanView.jsx";
import PlanEdit from "../pages/PlanEditPage.jsx";
import PlanCreate from "../components/plan/PlanCreate.jsx";

export default function PlanPage() {
  const navigate = useNavigate();
  const { userId: routeUserId, planId: routePlanId } = useParams(); // URL params

  // Auth and data state
  const [authUserId, setAuthUserId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "edit" | "create"
  const [loading, setLoading] = useState(true);

  // Owner’s nutrition targets for contextual display in PlanView
  const [ownerGoals, setOwnerGoals] = useState(null);
  const didSyncRef = useRef(false); // prevents repeated route sync

  // Resolve signed-in user
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setAuthUserId(user?.id || null);
      } catch {
        setAuthUserId(null);
      }
    })();
  }, []);

  // Load plans and goals for owner. Choose current plan. Sync URL if needed.
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const ownerId = routeUserId || authUserId;
        if (!ownerId) {
          // No owner yet: show create flow
          setPlans([]);
          setCurrentPlan(null);
          setOwnerGoals(null);
          setMode("create");
          return;
        }

        // Fetch all plans for owner
        const { data: planRows, error: plansErr } = await supabase
          .from("plans_v1")
          .select("*")
          .eq("owner_profile_id", ownerId)
          .order("created_at", { ascending: true });
        if (plansErr) throw plansErr;

        setPlans(planRows || []);

        // Select target plan from route or fallback to first
        let target = null;
        if (routePlanId && planRows?.length) {
          target = planRows.find((p) => String(p.plan_id) === String(routePlanId)) || null;
        }
        if (!target && planRows?.length) target = planRows[0];
        setCurrentPlan(target || null);

        // Fetch owner goals summary for display
        try {
          const { data: goals } = await supabase
            .from("goals_v1")
            .select("macro_protein_total, macro_carb_total, macro_carb_starch, macro_carb_fiber, macro_fat_total, micro_vitA, micro_vitC, micro_vitD, micro_calcium, micro_iron, micro_zinc, micro_magnesium")
            .eq("profile_id", ownerId)
            .single();
          setOwnerGoals(goals || null);
        } catch {
          setOwnerGoals(null);
        }

        // If no planId in URL but we have a target, push canonical route once
        if (!routePlanId && target && !didSyncRef.current) {
          didSyncRef.current = true;
          navigate(`/plan/${ownerId}/${target.plan_id}`, { replace: true });
          setMode("view");
          return;
        }

        // Decide mode based on existence of plans
        setMode((planRows?.length || 0) === 0 ? "create" : "view");
      } catch {
        setMode("create");
      } finally {
        setLoading(false);
      }
    };
    if (authUserId !== null) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeUserId, routePlanId, authUserId]);

  // Owner id used for nav updates
  const ownerIdForNav = useMemo(() => routeUserId || authUserId, [routeUserId, authUserId]);

  // Handlers: select existing plan, create new plan, update after edit
  const handleSelectPlan = (p) => {
    if (!p) return;
    setCurrentPlan(p);
    if (ownerIdForNav) navigate(`/plan/${ownerIdForNav}/${p.plan_id}`);
    setMode("view");
  };

  const handleCreated = (newPlan) => {
    setPlans((prev) => [...prev, newPlan]);
    setCurrentPlan(newPlan);
    setMode("view");
  };

  if (loading) return <Container>Loading...</Container>;

  // Mode switch: view current, edit current, or create flow
  return (
    <Container>
      {mode === "view" && currentPlan && (
        <PlanView
          plan={currentPlan}
          plans={plans}
          ownerGoals={ownerGoals}
          onEdit={() => setMode("edit")}
          onSelectPlan={handleSelectPlan}
          onCreateNew={() => setMode("create")}
        />
      )}

      {mode === "edit" && currentPlan && (
        <PlanEdit
          plan={currentPlan}
          onSave={(updatedPlan) => {
            setPlans((prev) => prev.map((p) => (p.plan_id === updatedPlan.plan_id ? updatedPlan : p)));
            setCurrentPlan(updatedPlan);
            setMode("view");
          }}
          onBack={() => setMode("view")}
        />
      )}

      {mode === "create" && <PlanCreate onCreate={handleCreated} />}
    </Container>
  );
}
