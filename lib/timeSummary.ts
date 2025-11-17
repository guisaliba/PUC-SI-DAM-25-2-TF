import type { PunchType } from "./utils";

type RawEntry = {
  type: PunchType;
  timestamp: string;
};

export type MonthlySummary = {
  totalMs: number;
  expectedMs: number;
  saldoMs: number;
  workDays: number;
};

// Current month, based on entry.type + timestamp
export function computeMonthlySummary(entries: RawEntry[]): MonthlySummary {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const byDay = new Map<string, { type: PunchType; time: Date }[]>();

  for (const e of entries) {
    const d = new Date(e.timestamp);
    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
      continue;
    }
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const list = byDay.get(key) ?? [];
    list.push({ type: e.type, time: d });
    byDay.set(key, list);
  }

  let totalMs = 0;

  byDay.forEach((list) => {
    // sort by time ASC
    list.sort((a, b) => a.time.getTime() - b.time.getTime());

    let state: "off" | "working" | "break" = "off";
    let lastTs: Date | null = null;
    let dayMs = 0;

    for (const entry of list) {
      const t = entry.time;

      switch (entry.type) {
        case "in":
          // start work
          state = "working";
          lastTs = t;
          break;

        case "start-break":
          if (state === "working" && lastTs) {
            dayMs += t.getTime() - lastTs.getTime();
          }
          state = "break";
          lastTs = t;
          break;

        case "end-break":
          if (state === "break") {
            state = "working";
            lastTs = t;
          }
          break;

        case "out":
          if (state === "working" && lastTs) {
            dayMs += t.getTime() - lastTs.getTime();
          }
          state = "off";
          lastTs = t;
          break;
      }
    }

    totalMs += dayMs;
  });

  const workDays = byDay.size;
  const expectedMs = workDays * 8 * 60 * 60 * 1000; // 8h/day
  const saldoMs = totalMs - expectedMs;

  return { totalMs, expectedMs, saldoMs, workDays };
}

export function formatDurationHMS(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}
