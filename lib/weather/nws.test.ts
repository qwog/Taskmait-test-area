import { describe, expect, it } from "vitest";
import { cureWindow, parseWindMph } from "./nws";

describe("parseWindMph", () => {
  it("parses a single-value wind string", () => {
    expect(parseWindMph("10 mph")).toBe(10);
  });
  it("averages a range", () => {
    expect(parseWindMph("5 to 15 mph")).toBe(10);
  });
  it("returns 0 on unparseable input", () => {
    expect(parseWindMph("calm")).toBe(0);
  });
});

describe("cureWindow", () => {
  const mk = (hoursOffset: number) => ({
    startTime: new Date(
      Date.UTC(2026, 5, 1, 12 + hoursOffset)
    ).toISOString(),
    temperature: 70 + hoursOffset,
    temperatureUnit: "F" as const,
    relativeHumidity: { value: 50 },
    windSpeed: "5 mph",
  });
  it("returns only periods inside the requested window", () => {
    const periods = [mk(-2), mk(0), mk(24), mk(71), mk(80)];
    const at = new Date(Date.UTC(2026, 5, 1, 12));
    const window = cureWindow(periods, at);
    expect(window.length).toBe(3);
    expect(window.map((p) => p.tempF)).toEqual([70, 94, 141]);
  });
});
