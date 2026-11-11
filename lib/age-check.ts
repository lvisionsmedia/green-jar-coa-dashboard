export type AgeCheckInput = {
  month: string;
  day: string;
  year: string;
};

export type AgeCheckStatus = "incomplete" | "invalid" | "ok" | "under";

export type AgeCheckResult = {
  status: AgeCheckStatus;
  age: number | null;
  /** ISO date YYYY-MM-DD of the 21st birthday when under 21 */
  turns21On: string | null;
  /** Human label e.g. "March 15, 2027" */
  turns21OnLabel: string | null;
  message: string;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** True if year/month/day form a real calendar date (local). */
export function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

function formatLongDate(year: number, month: number, day: number): string {
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/**
 * Full years of age from birth date to today (device local calendar).
 * Birthday tomorrow still counts as current age (not yet advanced).
 * Feb 29 births are treated as Feb 28 in non-leap years for the anniversary check.
 */
export function yearsBetween(birth: Date, today: Date): number {
  let age = today.getFullYear() - birth.getFullYear();
  const birthMonth = birth.getMonth();
  let birthDay = birth.getDate();

  if (birthMonth === 1 && birthDay === 29) {
    if (!isValidCalendarDate(today.getFullYear(), 2, 29)) {
      birthDay = 28;
    }
  }

  const monthDiff = today.getMonth() - birthMonth;
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDay)
  ) {
    age -= 1;
  }
  return age;
}

/**
 * 21st birthday on the local calendar.
 * Feb 29 births in non-leap years of the 21st anniversary use Feb 28
 * (JS Date rolls forward; we clamp via calendar validation of preferred day).
 */
export function twentyFirstBirthday(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
): { year: number; month: number; day: number } {
  const year = birthYear + 21;
  if (birthMonth === 2 && birthDay === 29 && !isValidCalendarDate(year, 2, 29)) {
    return { year, month: 2, day: 28 };
  }
  return { year, month: birthMonth, day: birthDay };
}

export function checkAge(
  input: AgeCheckInput,
  todayInput: Date = new Date(),
): AgeCheckResult {
  const monthRaw = input.month.trim();
  const dayRaw = input.day.trim();
  const yearRaw = input.year.trim();

  if (!monthRaw && !dayRaw && !yearRaw) {
    return {
      status: "incomplete",
      age: null,
      turns21On: null,
      turns21OnLabel: null,
      message: "Enter a birth date",
    };
  }

  // Partially filled
  if (
    monthRaw.length < 1 ||
    dayRaw.length < 1 ||
    yearRaw.length < 4
  ) {
    return {
      status: "incomplete",
      age: null,
      turns21On: null,
      turns21OnLabel: null,
      message: "Enter a birth date",
    };
  }

  if (!/^\d{1,2}$/.test(monthRaw) || !/^\d{1,2}$/.test(dayRaw) || !/^\d{4}$/.test(yearRaw)) {
    return {
      status: "invalid",
      age: null,
      turns21On: null,
      turns21OnLabel: null,
      message: "Check the date",
    };
  }

  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const year = Number(yearRaw);

  if (!isValidCalendarDate(year, month, day)) {
    return {
      status: "invalid",
      age: null,
      turns21On: null,
      turns21OnLabel: null,
      message: "Check the date",
    };
  }

  const today = startOfLocalDay(todayInput);
  const birth = new Date(year, month - 1, day);

  if (birth.getTime() > today.getTime()) {
    return {
      status: "invalid",
      age: null,
      turns21On: null,
      turns21OnLabel: null,
      message: "Check the date",
    };
  }

  const age = yearsBetween(birth, today);

  if (age >= 21) {
    return {
      status: "ok",
      age,
      turns21On: null,
      turns21OnLabel: null,
      message: `${age} — 21+ OK`,
    };
  }

  const t21 = twentyFirstBirthday(year, month, day);
  const turns21On = `${t21.year}-${pad2(t21.month)}-${pad2(t21.day)}`;
  const turns21OnLabel = formatLongDate(t21.year, t21.month, t21.day);

  return {
    status: "under",
    age,
    turns21On,
    turns21OnLabel,
    message: `${age} — UNDER 21`,
  };
}
