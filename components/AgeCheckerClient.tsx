"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { checkAge, type AgeCheckResult } from "@/lib/age-check";
import {
  appendAgeHistory,
  clearAgeHistory,
  formatBirthDisplay,
  formatCheckedAt,
  getClerkDeviceId,
  getClerkDeviceName,
  loadAgeHistory,
  setClerkDeviceName,
  type AgeHistoryEntry,
} from "@/lib/age-history";

type Tab = "check" | "history";

type PendingCheck = {
  logKey: string;
  checkedAt: string;
  status: "ok" | "under";
  age: number;
  idNumber: string;
  birthDisplay: string;
  message: string;
  turns21OnLabel: string | null;
};

function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

function panelClasses(status: AgeCheckResult["status"] | "need_id"): string {
  switch (status) {
    case "ok":
      return "bg-age-ok";
    case "under":
      return "bg-age-under";
    case "invalid":
    case "need_id":
      return "bg-age-warn";
    default:
      return "bg-age-neutral";
  }
}

function historyBadgeClass(status: AgeHistoryEntry["status"]): string {
  return status === "ok" ? "bg-age-ok" : "bg-age-under";
}

export function AgeCheckerClient() {
  const [tab, setTab] = useState<Tab>("check");
  const [idNumber, setIdNumber] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [history, setHistory] = useState<AgeHistoryEntry[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingCheck, setPendingCheck] = useState<PendingCheck | null>(null);

  const idRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const lastVibrateKey = useRef<string>("");
  const lastLoggedKey = useRef<string>("");

  const idReady = idNumber.trim().length > 0;

  const ageResult = useMemo(
    () => checkAge({ month, day, year }),
    [month, day, year],
  );

  const display = useMemo(() => {
    if (!idReady && (ageResult.status === "ok" || ageResult.status === "under")) {
      return {
        status: "need_id" as const,
        message: "Enter ID number",
        age: ageResult.age,
        turns21OnLabel: null as string | null,
      };
    }
    if (!idReady && ageResult.status === "incomplete") {
      return {
        status: "incomplete" as const,
        message: "Enter ID number & birth date",
        age: null as number | null,
        turns21OnLabel: null as string | null,
      };
    }
    if (!idReady && ageResult.status === "invalid") {
      return {
        status: "need_id" as const,
        message: "Enter ID number",
        age: null as number | null,
        turns21OnLabel: null as string | null,
      };
    }
    return {
      status: ageResult.status,
      message: ageResult.message,
      age: ageResult.age,
      turns21OnLabel: ageResult.turns21OnLabel,
    };
  }, [idReady, ageResult]);

  const canComplete =
    idReady && (ageResult.status === "ok" || ageResult.status === "under");

  useEffect(() => {
    setDeviceId(getClerkDeviceId());
    setDeviceName(getClerkDeviceName());
    setHistory(loadAgeHistory());
  }, []);

  useEffect(() => {
    if (tab === "check" && !showNameModal) {
      requestAnimationFrame(() => idRef.current?.focus());
    }
  }, [tab, showNameModal]);

  useEffect(() => {
    if (!showNameModal) return;
    requestAnimationFrame(() => nameRef.current?.focus());
  }, [showNameModal]);

  useEffect(() => {
    if (!canComplete || ageResult.status !== "under") {
      lastVibrateKey.current = "";
      return;
    }
    const key = `${idNumber.trim()}-${month}-${day}-${year}-${ageResult.age}`;
    if (lastVibrateKey.current === key) return;
    lastVibrateKey.current = key;
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(40);
    }
  }, [canComplete, ageResult.status, ageResult.age, idNumber, month, day, year]);

  useEffect(() => {
    if (!canComplete || ageResult.age === null) return;
    if (ageResult.status !== "ok" && ageResult.status !== "under") return;
    if (showNameModal) return;

    const idTrim = idNumber.trim();
    const birthKey = formatBirthDisplay(month, day, year);
    const logKey = `${idTrim}|${birthKey}`;
    if (lastLoggedKey.current === logKey) return;

    const pending: PendingCheck = {
      logKey,
      checkedAt: new Date().toISOString(),
      status: ageResult.status,
      age: ageResult.age,
      idNumber: idTrim,
      birthDisplay: birthKey,
      message: ageResult.message,
      turns21OnLabel: ageResult.turns21OnLabel,
    };

    const existingName = deviceName ?? getClerkDeviceName();
    if (!existingName) {
      setPendingCheck(pending);
      setNameDraft("");
      setShowNameModal(true);
      return;
    }

    lastLoggedKey.current = logKey;
    const next = appendAgeHistory({
      checkedAt: pending.checkedAt,
      status: pending.status,
      age: pending.age,
      idNumber: pending.idNumber,
      birthDisplay: pending.birthDisplay,
      message: pending.message,
      turns21OnLabel: pending.turns21OnLabel,
      deviceId: deviceId || getClerkDeviceId(),
      deviceName: existingName,
    });
    setHistory(next);
  }, [
    canComplete,
    ageResult,
    idNumber,
    month,
    day,
    year,
    deviceId,
    deviceName,
    showNameModal,
  ]);

  function saveDeviceNameAndLog() {
    const trimmed = nameDraft.trim();
    if (!trimmed || !pendingCheck) return;

    const savedName = setClerkDeviceName(trimmed);
    setDeviceName(savedName);
    lastLoggedKey.current = pendingCheck.logKey;

    const next = appendAgeHistory({
      checkedAt: pendingCheck.checkedAt,
      status: pendingCheck.status,
      age: pendingCheck.age,
      idNumber: pendingCheck.idNumber,
      birthDisplay: pendingCheck.birthDisplay,
      message: pendingCheck.message,
      turns21OnLabel: pendingCheck.turns21OnLabel,
      deviceId: deviceId || getClerkDeviceId(),
      deviceName: savedName,
    });
    setHistory(next);
    setPendingCheck(null);
    setShowNameModal(false);
    setNameDraft("");
  }

  function clearAll() {
    setIdNumber("");
    setMonth("");
    setDay("");
    setYear("");
    lastVibrateKey.current = "";
    lastLoggedKey.current = "";
    requestAnimationFrame(() => idRef.current?.focus());
  }

  function handleClearHistory() {
    setHistory(clearAgeHistory());
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
      </header>

      <div
        role="tablist"
        aria-label="Age checker sections"
        className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-age-border bg-age-panel p-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "check"}
          className={`h-12 rounded-xl text-lg font-black ${
            tab === "check" ? "bg-[#167238] text-white" : "text-age-muted"
          }`}
          onClick={() => setTab("check")}
        >
          Check
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          className={`h-12 rounded-xl text-lg font-black ${
            tab === "history" ? "bg-[#167238] text-white" : "text-age-muted"
          }`}
          onClick={() => setTab("history")}
        >
          History{history.length > 0 ? ` (${history.length})` : ""}
        </button>
      </div>

      {tab === "check" ? (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold tracking-wide text-age-muted uppercase">
              ID number <span className="text-[#c8f169]">(required)</span>
            </span>
            <input
              ref={idRef}
              inputMode="text"
              autoComplete="off"
              enterKeyHint="next"
              aria-label="ID number"
              aria-required="true"
              placeholder="Driver license / ID #"
              value={idNumber}
              className="h-16 rounded-2xl border-2 border-age-border bg-age-panel px-4 text-center text-2xl font-black tracking-wide text-age-text outline-none focus:border-[#78c51c]"
              onChange={(e) => setIdNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  monthRef.current?.focus();
                }
              }}
            />
          </label>

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
                    idRef.current?.focus();
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

          {display.status !== "incomplete" ? (
            <section
              aria-live="polite"
              className={`rounded-3xl px-5 py-8 text-center text-white shadow-lg ${panelClasses(display.status)}`}
            >
              <p className="text-4xl leading-tight font-black tracking-tight sm:text-5xl">
                {display.message}
              </p>
              {display.status === "under" && display.turns21OnLabel ? (
                <p className="mt-4 text-xl font-semibold text-white/95 sm:text-2xl">
                  Turns 21 on {display.turns21OnLabel}
                </p>
              ) : null}
            </section>
          ) : null}

          <button
            type="button"
            onClick={clearAll}
            className="h-16 rounded-2xl border-2 border-age-border bg-age-panel text-2xl font-black text-age-text active:scale-[0.98]"
          >
            Clear
          </button>
        </>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base text-age-muted">
              {history.length === 0
                ? "No checks yet"
                : `${history.length} check${history.length === 1 ? "" : "s"} on this device`}
            </p>
            {history.length > 0 ? (
              <button
                type="button"
                onClick={handleClearHistory}
                className="rounded-xl border border-age-border px-3 py-2 text-sm font-bold text-age-muted"
              >
                Clear history
              </button>
            ) : null}
          </div>

          {history.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-age-border bg-age-panel px-5 py-12 text-center text-lg text-age-muted">
              Completed checks appear here with the time they were run.
            </div>
          ) : (
            <ul className="flex max-h-[60dvh] flex-col gap-3 overflow-y-auto pb-2">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-age-border bg-age-panel p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-age-muted">
                        {formatCheckedAt(entry.checkedAt)}
                      </p>
                      <p className="mt-1 text-xl font-black text-age-text">
                        {entry.message}
                      </p>
                      <p className="mt-1 text-base font-semibold text-age-text">
                        ID {entry.idNumber}
                      </p>
                      <p className="mt-1 text-base text-age-muted">
                        DOB {entry.birthDisplay}
                      </p>
                      <p className="mt-1 text-sm text-age-muted">
                        {entry.deviceName}
                      </p>
                      {entry.status === "under" && entry.turns21OnLabel ? (
                        <p className="mt-1 text-sm text-age-muted">
                          Turns 21 on {entry.turns21OnLabel}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black tracking-wide text-white uppercase ${historyBadgeClass(entry.status)}`}
                    >
                      {entry.status === "ok" ? "21+" : "Under"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="text-center text-sm text-age-muted">
        Offline OK · history stays on this phone · nothing uploaded
        {deviceName ? (
          <>
            <br />
            {deviceName}
          </>
        ) : null}
      </p>

      {showNameModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="device-name-title"
        >
          <div className="w-full max-w-md rounded-3xl border-2 border-age-border bg-[#102016] p-6 shadow-2xl">
            <h2
              id="device-name-title"
              className="text-center text-2xl font-black text-age-text"
            >
              Name this device
            </h2>
            <p className="mt-2 text-center text-sm text-age-muted">
              e.g. Front door · Register 2
            </p>
            <input
              ref={nameRef}
              type="text"
              autoComplete="off"
              enterKeyHint="done"
              maxLength={40}
              aria-label="Device name"
              placeholder="Front door"
              value={nameDraft}
              className="mt-5 h-14 w-full rounded-2xl border-2 border-age-border bg-age-panel px-4 text-center text-xl font-black text-age-text outline-none focus:border-[#78c51c]"
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveDeviceNameAndLog();
                }
              }}
            />
            <button
              type="button"
              disabled={nameDraft.trim().length === 0}
              onClick={saveDeviceNameAndLog}
              className="mt-4 h-14 w-full rounded-2xl bg-[#167238] text-xl font-black text-white disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
