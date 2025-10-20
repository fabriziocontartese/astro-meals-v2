import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container } from "@radix-ui/themes";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../auth/supabaseClient.js";
import PlanView from "../components/plan/view/PlanView.jsx";
import PlanEdit from "../pages/PlanEditPage.jsx";
import PlanCreate from "../components/plan/PlanCreate.jsx";

export default function PlanPage() {
  const navigate = useNavigate();
  const { userId: routeUserId, planId: routePlanId } = useParams(); // /plan/:userId/:planId

  const [authUserId, setAuthUserId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "edit" | "create"
  const [loading, setLoading] = useState(true);

  const [ownerGoals, setOwnerGoals] = useState(null);
  const didSyncRef = useRef(false);

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

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const ownerId = routeUserId || authUserId;
        if (!ownerId) {
          setPlans([]);
          setCurrentPlan(null);
          setOwnerGoals(null);
          setMode("create");
          return;
        }

        const { data: planRows, error: plansErr } = await supabase
          .from("plans_v1")
          .select("*")
          .eq("owner_profile_id", ownerId)
          .order("created_at", { ascending: true });
        if (plansErr) throw plansErr;

        setPlans(planRows || []);

        let target = null;
        if (routePlanId && planRows?.length) {
          target = planRows.find((p) => String(p.plan_id) === String(routePlanId)) || null;
        }
        if (!target && planRows?.length) target = planRows[0];
        setCurrentPlan(target || null);

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

        if (!routePlanId && target && !didSyncRef.current) {
          didSyncRef.current = true;
          navigate(`/plan/${ownerId}/${target.plan_id}`, { replace: true });
          setMode("view");
          return;
        }

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

  const ownerIdForNav = useMemo(() => routeUserId || authUserId, [routeUserId, authUserId]);

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
