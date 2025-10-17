// src/components/plan/view/PlanViewCalendar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Flex, Text, Card, ScrollArea, Button } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient.js";
import RecipeDetailsModal from "../../recipes/RecipeDetailsModal.jsx";

const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// layout
const COL_W = 160;
const DOT = 10;

// date helpers
const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseYMD = (s) => {
  if (!s) return new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
};
function parseISODate(s) {
  const d = s ? new Date(s) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function diffDays(a, b) { return Math.floor((parseISODate(b) - parseISODate(a)) / 86400000); }

export default function PlanViewCalendar({ plan, viewMode = "full", onPatched }) {
  const meals = plan?.meal_names || ["Breakfast", "Lunch", "Snack", "Dinner"];
  const useFlat = !!plan?.plan_recipes?.flat?.days;
  const lengthDays = Math.max(1, Number(plan?.plan_recipes?.flat?.length_days || plan?.length_days || 0));

  // local start date with auto-loop
  const [startISO, setStartISO] = useState(plan?.objective?.start_date || toISO(new Date()));

  // Auto-loop: if plan ended, roll start_date forward so "new start" is today (or the next cycle)
  useEffect(() => {
    const len = Number(lengthDays || 0);
    if (!len || !plan?.plan_id) return;

    const start = parseYMD(plan?.objective?.start_date || startISO);
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const daysSinceStart = diffDays(start, today); // 0-based
    if (daysSinceStart < len) return;

    const cycles = Math.floor(daysSinceStart / len);
    const newStart = addDays(start, cycles * len);
    const iso = toISO(newStart);

    setStartISO(iso);

    (async () => {
      try {
        const nextObjective = { ...(plan?.objective || {}), start_date: iso };
        const { data, error } = await supabase
          .from("plans_v1")
          .update({ objective: nextObjective })
          .eq("plan_id", plan.plan_id)
          .select("*")
          .single();
        if (error) throw error;
        onPatched?.(data || { ...plan, objective: nextObjective });
      } catch {
        // silent
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.plan_id, plan?.objective?.start_date, lengthDays]);

  const startDate = parseISODate(startISO);
  const todayIdx1 = (() => {
    const d = diffDays(startDate, new Date()) + 1;
    return d >= 1 && d <= lengthDays ? d : null;
  })();

  const dayMeta = useMemo(
    () =>
      Array.from({ length: lengthDays }, (_, i) => {
        const dayIdx1 = i + 1;
        const dateObj = addDays(startDate, dayIdx1 - 1);
        return {
          dayIdx1,
          dateObj,
          headerTop: `${dateObj.getDate()} ${monthShort[dateObj.getMonth()]}`,
          headerBottom: dayNames[dateObj.getDay()],
        };
      }),
    [lengthDays, startDate]
  );

  // ===== Modal state for RecipeDetails =====
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRecipe, setDetailsRecipe] = useState(null);

  const openDetailsFor = async (maybeItem) => {
    const rid = maybeItem?.recipe_id;
    if (!rid) return;
    try {
      const { data, error } = await supabase
        .from("recipes_v1")
        .select("*")
        .eq("recipe_id", rid)
        .single();
      if (error) throw error;
      setDetailsRecipe(data || null);
      setDetailsOpen(true);
    } catch {
      // no-op
    }
  };

  // ===== Helpers shared by both views =====
  const getItem = (dayIdx1, mealType) => {
    if (useFlat) {
      const flatDay = plan?.plan_recipes?.flat?.days?.[String(dayIdx1)] || {};
      const idx = meals.findIndex((m) => m === mealType);
      const hit = flatDay[String(idx + 1)] || null;
      return hit ? { type: mealType, ...hit } : null;
    }
    const dateObj = addDays(startDate, dayIdx1 - 1);
    const weekIdx0 = Math.floor((dayIdx1 - 1) / 7);
    const dayName = dayNames[dateObj.getDay()];
    const arr = plan?.plan_recipes?.weeks?.[weekIdx0]?.[dayName] || [];
    return arr.find((x) => x.type === mealType) || null;
  };

  // ===== FULL VIEW (unchanged) =====
  const viewportRef = useRef(null);
  const [vpW, setVpW] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (viewMode !== "full") return;
    const vp = viewportRef.current;
    if (!vp) return;
    const onScroll = () => setScrollLeft(vp.scrollLeft);
    const ro = new ResizeObserver(() => setVpW(vp.clientWidth));
    setVpW(vp.clientWidth);
    vp.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(vp);
    return () => { vp.removeEventListener("scroll", onScroll); ro.disconnect(); };
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "full") return;
    const vp = viewportRef.current;
    if (!vp || !todayIdx1) return;
    const left = (todayIdx1 - 1) * COL_W - vp.clientWidth * 0.35;
    vp.scrollLeft = Math.max(0, left);
  }, [todayIdx1, vpW, viewMode]);

  const totalContentW = lengthDays * COL_W;
  const maxScroll = Math.max(1, totalContentW - vpW);
  const highlightLeftPx = (scrollLeft / maxScroll) * Math.max(0, vpW - (vpW * vpW) / totalContentW);
  const highlightW = totalContentW <= vpW ? vpW : (vpW / totalContentW) * vpW;

  const scrollToDay = (d) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const left = (d - 1) * COL_W - vp.clientWidth * 0.35;
    vp.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  };

  // ===== DAY VIEW state =====
  const [dayIdx1, setDayIdx1] = useState(() => todayIdx1 || 1);
  useEffect(() => {
    // keep in range if plan changes
    setDayIdx1((d) => Math.min(Math.max(1, d || 1), lengthDays));
  }, [lengthDays]);

  const metaForDay = useMemo(() => {
    const meta = dayMeta.find((m) => m.dayIdx1 === dayIdx1);
    return meta || dayMeta[0];
  }, [dayMeta, dayIdx1]);

  // ===== Render switch =====
  if (viewMode === "day") {
    const isToday = todayIdx1 === dayIdx1;
    const dateStr = metaForDay
      ? `${metaForDay.headerBottom}, ${metaForDay.dateObj.getDate()} ${monthShort[metaForDay.dateObj.getMonth()]} ${metaForDay.dateObj.getFullYear()}`
      : "";

    return (
      <>
        <Card>
          <Flex align="center" justify="between" p="3" wrap="wrap" gap="3">
            <Flex align="center" gap="2">
              <Button
                variant="soft"
                onClick={() => setDayIdx1((d) => Math.max(1, d - 1))}
                disabled={dayIdx1 <= 1}
                aria-label="Previous day"
              >
                ◀
              </Button>
              <Text size="4" weight="bold" style={{ color: isToday ? "var(--green-11)" : "inherit" }}>
                {dateStr}
              </Text>
              <Button
                variant="soft"
                onClick={() => setDayIdx1((d) => Math.min(lengthDays, d + 1))}
                disabled={dayIdx1 >= lengthDays}
                aria-label="Next day"
              >
                ▶
              </Button>
            </Flex>
            <Text size="2" color="gray">Day {dayIdx1} of {lengthDays}</Text>
          </Flex>

          <div style={{ padding: "0 12px 12px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {meals.map((meal, idx) => {
                const item = getItem(dayIdx1, meal);
                const hasId = !!item?.recipe_id;
                return (
                  <div
                    key={`${dayIdx1}-${meal}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 4px",
                      borderTop: idx === 0 ? "none" : "1px solid var(--gray-3)",
                      minHeight: 52,
                    }}
                    title={item ? `${meal}: ${item.name}` : `${meal}: No recipe`}
                  >
                    {item?.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        onError={(ev) => (ev.currentTarget.style.display = "none")}
                        style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          border: "1px dashed var(--gray-7)",
                        }}
                      />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <Text size="1" color="gray">{meal}</Text>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 14 }}>
                        {item?.name || "—"}
                      </div>
                    </div>
                    <Button
                      size="1"
                      variant="soft"
                      disabled={!hasId}
                      onClick={() => openDetailsFor(item)}
                      aria-label={`Open details for ${item?.name || meal}`}
                    >
                      Details
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <RecipeDetailsModal
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          recipe={detailsRecipe}
          canEdit={false}
        />
      </>
    );
  }

  // ===== FULL VIEW (original grid) =====
  return (
    <Card>
      <div style={{ padding: 8, background: "white" }}>
        <ScrollArea ref={viewportRef} type="auto" scrollbars="horizontal">
          <div
            style={{
              minWidth: lengthDays * COL_W,
              display: "grid",
              gridTemplateColumns: `repeat(${lengthDays}, ${COL_W}px)`,
              gap: 0,
            }}
          >
            {dayMeta.map(({ dayIdx1, headerTop, headerBottom }) => {
              const isToday = todayIdx1 === dayIdx1;
              return (
                <div key={`day-${dayIdx1}`} style={{ padding: "6px 8px" }}>
                  <div
                    style={{
                      textAlign: "center",
                      lineHeight: 1.15,
                      borderRadius: 12,
                      padding: "8px 6px",
                      border: isToday ? "2px solid var(--green-9)" : "1px solid transparent",
                    }}
                  >
                    <Text size="2" weight="bold" style={{ color: isToday ? "var(--green-11)" : "inherit" }}>
                      {headerTop}
                    </Text>
                    <div style={{ fontSize: 12, color: isToday ? "var(--green-11)" : "var(--gray-11)" }}>{headerBottom}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
                    {meals.map((meal, idx) => {
                      const item = getItem(dayIdx1, meal);
                      return (
                        <div
                          key={`${dayIdx1}-${meal}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 4px",
                            minHeight: 48,
                            borderTop: idx === 0 ? "none" : "1px solid var(--gray-3)",
                          }}
                          title={item ? `${meal}: ${item.name}` : `${meal}: No recipe`}
                        >
                          {item?.image_url ? (
                            <img
                              src={item.image_url}
                              alt=""
                              onError={(ev) => (ev.currentTarget.style.display = "none")}
                              style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, flex: "0 0 auto" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                border: "1px dashed var(--gray-7)",
                                flex: "0 0 auto",
                              }}
                            />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <Text size="1" color="gray">{meal}</Text>
                            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 13 }}>
                              {item?.name || "—"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div style={{ position: "relative", marginTop: 10, padding: "0 8px" }}>
        <Flex align="center" gap="8px">
          <div style={{ width: "100%", position: "relative" }}>
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: lengthDays === 1 ? "center" : "space-between",
                alignItems: "center",
                padding: "4px 0",
              }}
            >
              {Array.from({ length: lengthDays }, (_, i) => i + 1).map((d) => {
                const isToday = todayIdx1 === d;
                return (
                  <button
                    key={`dot-${d}`}
                    onClick={() => scrollToDay(d)}
                    title={`Day ${d}`}
                    style={{
                      width: DOT,
                      height: DOT,
                      borderRadius: 999,
                      background: isToday ? "var(--green-9)" : "var(--gray-6)",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  />
                );
              })}
            </div>
            <ViewportHighlight
              vpW={vpW}
              totalContentW={lengthDays * COL_W}
              leftPx={highlightLeftPx}
              widthPx={Math.max(DOT, highlightW)}
            />
          </div>
        </Flex>
      </div>

      {/* Reuse modal in full view when needed */}
      <RecipeDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        recipe={detailsRecipe}
        canEdit={false}
      />
    </Card>
  );
}

function ViewportHighlight({ vpW, totalContentW, leftPx, widthPx }) {
  if (!vpW || !totalContentW) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: leftPx,
        width: widthPx,
        height: DOT + 8,
        borderRadius: 999,
        border: "2px solid var(--accent-9)",
        pointerEvents: "none",
      }}
    />
  );
}
