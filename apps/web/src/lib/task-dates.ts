/** Tanggal tugas memakai zona waktu perangkat user. */

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → "YYYY-MM-DD" (lokal). */
export const localDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Date → "HH:mm" (lokal). */
export const localTimeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "YYYY-MM-DD" + "HH:mm" lokal → ISO dengan offset (untuk API). */
export function dueToIso(dateKey: string, time?: string | null) {
  return new Date(`${dateKey}T${time || "00:00"}:00`).toISOString();
}

export function addDaysKey(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  return localDateKey(new Date(y, m - 1, d + n));
}

export type TaskGroup = "overdue" | "today" | "tomorrow" | "week" | "later" | "noDate" | "done";

export const GROUP_ORDER: TaskGroup[] = ["overdue", "today", "tomorrow", "week", "later", "noDate", "done"];

export function taskGroup(task: { status: string; dueDate: string | null }, today: string): TaskGroup {
  if (task.status === "DONE") return "done";
  if (!task.dueDate) return "noDate";
  const key = localDateKey(new Date(task.dueDate));
  if (key < today) return "overdue";
  if (key === today) return "today";
  if (key === addDaysKey(today, 1)) return "tomorrow";
  if (key <= addDaysKey(today, 7)) return "week";
  return "later";
}
