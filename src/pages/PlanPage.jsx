// src/pages/PlanPage.jsx
import React, { useState, useEffect } from "react";
import { Container } from "@radix-ui/themes";
import { supabase } from "../auth/supabaseClient";
import PlanView from "../components/plan/view/PlanView.jsx";
import PlanEdit from "../components/plan/edit/PlanEdit.jsx";
import PlanCreate from "../components/plan/PlanCreate.jsx";

export default function PlanPage() {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [mode, setMode] = useState("view"); // "view" | "edit" | "create"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        
        if (!userId) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('plans_v1')
          .select('*')
          .eq('owner_profile_id', userId);

        if (error) throw error;

        setPlans(data || []);
        
        if (data && data.length > 0) {
          setCurrentPlan(data[0]);
          setMode("view");
        } else {
          setMode("create");
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  if (loading) {
    return <Container>Loading...</Container>;
  }

  return (
    <Container>
      {mode === "view" && currentPlan && (
        <PlanView 
          plan={currentPlan} 
          onEdit={() => setMode("edit")}
        />
      )}
      {mode === "edit" && currentPlan && (
        <PlanEdit 
          plan={currentPlan}
          onSave={(updatedPlan) => {
            setCurrentPlan(updatedPlan);
            setMode("view");
          }}
          onCancel={() => setMode("view")}
        />
      )}
      {mode === "create" && (
        <PlanCreate 
          onSave={(newPlan) => {
            setPlans([...plans, newPlan]);
            setCurrentPlan(newPlan);
            setMode("view");
          }}
        />
      )}
    </Container>
  );
}
