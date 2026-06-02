export type PerformanceRating = "A'lo" | "Yaxshi" | "O'rtacha" | "Yomon";

export interface EmployeeStats {
  fish: string;
  bolim: string;
  lavozim: string;
  totalTasks: number;
  completed: number;
  onTime: number;
  delayedCompleted: number;
  pending: number;
  late: number;
  inProgress: number;
  avgDelayDays: number;
  onTimePercent: number;
  approvalRate: number;
  productivityScore: number;
  rating: PerformanceRating;
}

type TaskInput = {
  fish: string;
  bolim: string;
  lavozim: string;
  holati: string;
  /** Column N ARRAYFORMULA text — source of truth for delay display and on-time classification */
  kechikishMatn?: string;
  tugatishBelgilash?: boolean;
};

function calcScore(
  onTimePercent: number,
  approvalRate: number,
  avgDelayDays: number,
): number {
  const onTimePart = (onTimePercent / 100) * 60;
  const approvalPart = (approvalRate / 100) * 20;
  const delayPart = Math.max(0, 1 - avgDelayDays / 30) * 20;
  return Math.round(onTimePart + approvalPart + delayPart);
}

function getRating(score: number, onTimePercent: number): PerformanceRating {
  if (score >= 80 && onTimePercent >= 75) return "A'lo";
  if (score >= 55 && onTimePercent >= 50) return "Yaxshi";
  if (score >= 30) return "O'rtacha";
  return "Yomon";
}

export const RATING_META: Record<
  PerformanceRating,
  { color: string; bg: string; icon: string }
> = {
  "A'lo": { color: "#16a34a", bg: "#dcfce7", icon: "award" },
  Yaxshi: { color: "#2563eb", bg: "#dbeafe", icon: "thumbs-up" },
  "O'rtacha": { color: "#d97706", bg: "#fef3c7", icon: "minus-circle" },
  Yomon: { color: "#dc2626", bg: "#fee2e2", icon: "alert-circle" },
};

export function computeEmployeeStats(rows: TaskInput[]): EmployeeStats[] {
  const map = new Map<string, { meta: TaskInput; tasks: TaskInput[] }>();

  for (const row of rows) {
    if (!row.fish?.trim()) continue;
    if (!map.has(row.fish)) {
      map.set(row.fish, { meta: row, tasks: [] });
    }
    map.get(row.fish)!.tasks.push(row);
  }

  const result: EmployeeStats[] = [];

  for (const { meta, tasks } of map.values()) {
    const totalTasks = tasks.length;
    const completed = tasks.filter((t) => t.holati === "Yakunlandi").length;
    const late = tasks.filter((t) => t.holati === "Kechikdi").length;
    const pending = tasks.filter((t) => t.holati === "Tekshirishda").length;
    const inProgress = tasks.filter((t) => t.holati === "Jarayonda").length;

    // On-time: completed with no delay text, or "O'z vaqtida" / "avval" (early counts as on-time)
    const isLateText = (t: TaskInput) => !!t.kechikishMatn?.includes("kech");
    const onTime = tasks.filter(
      (t) => t.holati === "Yakunlandi" && !isLateText(t),
    ).length;
    const delayedCompleted = tasks.filter(
      (t) => t.holati === "Yakunlandi" && isLateText(t),
    ).length;

    // Extract numeric day count from "N kun kech bajarilgan" for avgDelayDays
    const extractDays = (matn?: string): number => {
      if (!matn) return 0;
      const m = matn.match(/^(\d+)\s*kun\s*kech/);
      return m ? parseInt(m[1], 10) : 0;
    };
    const delayedTasks = tasks.filter((t) => isLateText(t));
    const avgDelayDays =
      delayedTasks.length > 0
        ? Math.round(
            delayedTasks.reduce((s, t) => s + extractDays(t.kechikishMatn), 0) /
              delayedTasks.length,
          )
        : 0;

    const onTimePercent =
      totalTasks > 0 ? Math.round((onTime / totalTasks) * 100) : 0;

    const submittedCount = completed + pending;
    const approvedCount = tasks.filter((t) => t.tugatishBelgilash).length;
    const approvalRate =
      submittedCount > 0
        ? Math.round((approvedCount / submittedCount) * 100)
        : 0;

    const productivityScore = calcScore(onTimePercent, approvalRate, avgDelayDays);
    const rating = getRating(productivityScore, onTimePercent);

    result.push({
      fish: meta.fish,
      bolim: meta.bolim,
      lavozim: meta.lavozim,
      totalTasks,
      completed,
      onTime,
      delayedCompleted,
      pending,
      late,
      inProgress,
      avgDelayDays,
      onTimePercent,
      approvalRate,
      productivityScore,
      rating,
    });
  }

  return result.sort((a, b) => b.productivityScore - a.productivityScore);
}
