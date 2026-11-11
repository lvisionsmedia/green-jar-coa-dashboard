"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { checkAge, type AgeCheckResult } from "@/lib/age-check";

function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

function panelClasses(status: AgeCheckResult["status"]): string {
  switch (status) {
    case "ok":
      return "bg-age-ok";
    case "under":
      return "bg-age-under";
    case "invalid":
      return "bg-age-warn";
    default:
      return "bg-age-neutral";
  }
}

export function AgeCheckerClient() {
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");

  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const lastVibrateKey = useRef<string>("");

  const result = useMemo(
    () => checkAge({ month, day, year }),
    [month, day, year],
  );

  useEffect(() => {
    monthRef.current?.focus();
  }, []);

  useEffect(() => {
    if (result.status !== "under") {
      lastVibrateKey.current = "";
      return;
    }
    const key = `${month}-${day}-${year}-${result.age}`;
    if (lastVibrateKey.current === key) return;
    lastVibrateKey.current = key;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(40);
    }
  }, [result.status, result.age, month, day, year]);

  function clearAll() {
    setMonth("");
    setDay("");
    setYear("");
    lastVibrateKey.current = "";
    requestAnimationFrame(() => monthRef.current?.focus());
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="text-center">
        <p className="text-sm font-bold tracking-[0.18em] text-[#78c51c] uppercase">
          The Green Jar
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-age-text sm:text-4xl">
          21+ Age Checker
        </h1>
        <p className="mt-2 text-base text-age-muted">
          Door check-in · birth date stays on this device
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-center text-xs font-bold tracking-wide text-age-muted uppercase">
            Month
          </span>
          <input
            ref={monthRef}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            enterKeyHint="next"
            aria-label="Birth month"
            placeholder="MM"
            value={month}
            maxLength={2}
            className="h-20 rounded-2xl border-2 border-age-border bg-age-panel text-center text-4xl font-black text-age-text outline-none focus:border-[#78c51c]"
            onChange={(e) => {
              const next = digitsOnly(e.target.value, 2);
              setMonth(next);
              if (next.length === 2) dayRef.current?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && month === "") {
                e.preventDefault();
              }
            }}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-center text-xs font-bold tracking-wide text-age-muted uppercase">
            Day
          </span>
          <input
            ref={dayRef}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            enterKeyHint="next"
            aria-label="Birth day"
            placeholder="DD"
            value={day}
            maxLength={2}
            className="h-20 rounded-2xl border-2 border-age-border bg-age-panel text-center text-4xl font-black text-age-text outline-none focus:border-[#78c51c]"
            onChange={(e) => {
              const next = digitsOnly(e.target.value, 2);
              setDay(next);
              if (next.length === 2) yearRef.current?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && day === "") {
                e.preventDefault();
                monthRef.current?.focus();
              }
            }}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-center text-xs font-bold tracking-wide text-age-muted uppercase">
            Year
          </span>
          <input
            ref={yearRef}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            enterKeyHint="done"
            aria-label="Birth year"
            placeholder="YYYY"
            value={year}
            maxLength={4}
            className="h-20 rounded-2xl border-2 border-age-border bg-age-panel text-center text-4xl font-black text-age-text outline-none focus:border-[#78c51c]"
            onChange={(e) => {
              setYear(digitsOnly(e.target.value, 4));
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && year === "") {
                e.preventDefault();
                dayRef.current?.focus();
              }
            }}
          />
        </label>
      </div>

      <section
        aria-live="polite"
        className={`rounded-3xl px-5 py-8 text-center text-white shadow-lg ${panelClasses(result.status)}`}
      >
        <p className="text-4xl leading-tight font-black tracking-tight sm:text-5xl">
          {result.message}
        </p>
        {result.status === "under" && result.turns21OnLabel ? (
          <p className="mt-4 text-xl font-semibold text-white/95 sm:text-2xl">
            Turns 21 on {result.turns21OnLabel}
          </p>
        ) : null}
      </section>

      <button
        type="button"
        onClick={clearAll}
        className="h-16 rounded-2xl border-2 border-age-border bg-age-panel text-2xl font-black text-age-text active:scale-[0.98]"
      >
        Clear
      </button>

      <p className="text-center text-sm text-age-muted">
        Offline OK · no accounts · nothing saved
      </p>
    </div>
  );
}
