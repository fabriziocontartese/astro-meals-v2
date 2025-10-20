// src/components/plan/view/PlanViewCalendar.jsx
// High-level: Read-only calendar timeline for a plan. Horizontally scrollable days with meal rows.
// Auto-rolls start date forward when a cycle ends. Supports "flat" or "weeks" plan formats.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Flex, Text, Card, ScrollArea } from "@radix-ui/themes";
import { supabase } from "../../../auth/supabaseClient.js";

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

export default function PlanViewCalendar({ plan, onPatched }) {
  // Inputs and mode
  const meals = plan?.meal_names || ["Breakfast", "Lunch", "Snack", "Dinner"];
  const useFlat = !!plan?.plan_recipes?.flat?.days;
  const lengthDays = Math.max(1, Number(plan?.plan_recipes?.flat?.length_days || plan?.length_days || 0));

  // Local start date; initializes from plan objective, else today
  const [startISO, setStartISO] = useState(plan?.objective?.start_date || toISO(new Date()));

  // Auto-loop: when today is past the cycle, shift start_date forward and persist
  useEffect(() => {
    const len = Number(lengthDays || 0);
    if (!len || !plan?.plan_id) return;

    const start = parseYMD(plan?.objective?.start_date || startISO);
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const daysSinceStart = diffDays(start, today); // 0-based
    if (daysSinceStart < len) return;

    const cycles = Math.floor(daysSinceStart / len);
    const newStart = addDays(start, cycles * len); // day after last cycle end
    const iso = toISO(newStart);

    // Update local immediately
    setStartISO(iso);

    // Persist silently
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
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.plan_id, plan?.objective?.start_date, lengthDays]);

  // Derived day metadata and "today" index within the cycle
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

  // Horizontal scroll management and viewport sizing
  const viewportRef = useRef(null);
  const [vpW, setVpW] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onScroll = () => setScrollLeft(vp.scrollLeft);
    const ro = new ResizeObserver(() => setVpW(vp.clientWidth));
    setVpW(vp.clientWidth);
    vp.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(vp);
    return () => { vp.removeEventListener("scroll", onScroll); ro.disconnect(); };
  }, []);

  // On mount or size change: center current day in view
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !todayIdx1) return;
    const left = (todayIdx1 - 1) * COL_W - vp.clientWidth * 0.35;
    vp.scrollLeft = Math.max(0, left);
  }, [todayIdx1, vpW]);

  // Mini-map highlight math
  const totalContentW = lengthDays * COL_W;
  const maxScroll = Math.max(1, totalContentW - vpW);
  const highlightLeftPx = (scrollLeft / maxScroll) * Math.max(0, vpW - (vpW * vpW) / totalContentW);
  const highlightW = totalContentW <= vpW ? vpW : (vpW / totalContentW) * vpW;

  // Accessor for a day's meal item across flat and weekly schemas
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

  // Jump to a day when clicking its dot
  const scrollToDay = (d) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const left = (d - 1) * COL_W - vp.clientWidth * 0.35;
    vp.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  };

  return (
    <Card>
      {/* Timeline grid: one column per day with meal rows */}
      <div style={{ padding: 8, background: "white" }}>
        <ScrollArea ref={viewportRef} type="auto" scrollbars="horizontal">
          <div
            style={{
              minWidth: totalContentW,
              display: "grid",
              gridTemplateColumns: `repeat(${lengthDays}, ${COL_W}px)`,
              gap: 0,
            }}
          >
            {dayMeta.map(({ dayIdx1, headerTop, headerBottom }) => {
              const isToday = todayIdx1 === dayIdx1;
              return (
                <div key={`day-${dayIdx1}`} style={{ padding: "6px 8px" }}>
                  {/* Day header with current-day ring */}
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

                  {/* Meal rows with small image or placeholder */}
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

      {/* Pagination dots + viewport window indicator */}
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
            <ViewportHighlight vpW={vpW} totalContentW={totalContentW} leftPx={highlightLeftPx} widthPx={Math.max(DOT, highlightW)} />
          </div>
        </Flex>
      </div>
    </Card>
  );
}

// Mini "window" that mirrors the visible slice of the horizontal grid
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
