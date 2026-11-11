import { describe, expect, it } from "vitest";
import {
  checkAge,
  isValidCalendarDate,
  twentyFirstBirthday,
  yearsBetween,
} from "./age-check";

function d(y: number, m: number, day: number): Date {
  return new Date(y, m - 1, day);
}

describe("isValidCalendarDate", () => {
  it("rejects Feb 30", () => {
    expect(isValidCalendarDate(2000, 2, 30)).toBe(false);
  });

  it("accepts Feb 29 on leap years", () => {
    expect(isValidCalendarDate(2000, 2, 29)).toBe(true);
  });

  it("rejects Feb 29 on non-leap years", () => {
    expect(isValidCalendarDate(2001, 2, 29)).toBe(false);
  });
});

describe("yearsBetween", () => {
  it("counts exact birthday today as that age", () => {
    expect(yearsBetween(d(2000, 3, 15), d(2021, 3, 15))).toBe(21);
  });

  it("is still previous age the day before birthday", () => {
    expect(yearsBetween(d(2000, 3, 15), d(2021, 3, 14))).toBe(20);
  });
});

describe("checkAge", () => {
  it("exact 21st birthday today is green / ok", () => {
    const result = checkAge(
      { month: "03", day: "15", year: "2000" },
      d(2021, 3, 15),
    );
    expect(result.status).toBe("ok");
    expect(result.age).toBe(21);
    expect(result.message).toBe("21 — 21+ OK");
  });

  it("day before 21st birthday is red / under", () => {
    const result = checkAge(
      { month: "03", day: "15", year: "2000" },
      d(2021, 3, 14),
    );
    expect(result.status).toBe("under");
    expect(result.age).toBe(20);
    expect(result.message).toBe("20 — UNDER 21");
    expect(result.turns21On).toBe("2021-03-15");
    expect(result.turns21OnLabel).toBe("March 15, 2021");
  });

  it("handles leap-day birthdays (Feb 29)", () => {
    // Born Feb 29 2000; on Mar 1 2021 they are 21
    const onBirthday = checkAge(
      { month: "02", day: "29", year: "2000" },
      d(2021, 2, 28),
    );
    // 2021 is not a leap year — 21st anniversary clamped to Feb 28
    expect(twentyFirstBirthday(2000, 2, 29)).toEqual({
      year: 2021,
      month: 2,
      day: 28,
    });
    expect(onBirthday.status).toBe("ok");
    expect(onBirthday.age).toBe(21);

    const dayBefore = checkAge(
      { month: "02", day: "29", year: "2000" },
      d(2021, 2, 27),
    );
    expect(dayBefore.status).toBe("under");
    expect(dayBefore.age).toBe(20);
    expect(dayBefore.turns21On).toBe("2021-02-28");
  });

  it("rejects invalid dates like Feb 30", () => {
    const result = checkAge(
      { month: "02", day: "30", year: "2000" },
      d(2024, 1, 1),
    );
    expect(result.status).toBe("invalid");
    expect(result.message).toBe("Check the date");
  });

  it("rejects future dates", () => {
    const result = checkAge(
      { month: "12", day: "31", year: "2099" },
      d(2024, 6, 1),
    );
    expect(result.status).toBe("invalid");
    expect(result.message).toBe("Check the date");
  });

  it("rejects non-4-digit year as incomplete until 4 digits, then invalid if garbage", () => {
    expect(
      checkAge({ month: "01", day: "01", year: "99" }, d(2024, 1, 1)).status,
    ).toBe("incomplete");
    expect(
      checkAge({ month: "01", day: "01", year: "abcd" }, d(2024, 1, 1)).status,
    ).toBe("invalid");
  });

  it("empty or partial input is incomplete", () => {
    expect(
      checkAge({ month: "", day: "", year: "" }, d(2024, 1, 1)).message,
    ).toBe("Enter a birth date");
    expect(
      checkAge({ month: "01", day: "", year: "" }, d(2024, 1, 1)).status,
    ).toBe("incomplete");
  });

  it("allows single-digit month/day once year is complete", () => {
    const result = checkAge(
      { month: "1", day: "5", year: "2000" },
      d(2025, 1, 5),
    );
    expect(result.status).toBe("ok");
    expect(result.age).toBe(25);
  });
});
