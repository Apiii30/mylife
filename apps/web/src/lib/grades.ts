/** Huruf mutu → bobot. Dua skala umum di kampus Indonesia; hurufnya tidak bertabrakan, jadi cukup satu tabel. */
export const GRADE_POINTS: Record<string, number> = {
  A: 4,
  "A-": 3.7,
  AB: 3.5,
  "B+": 3.3,
  B: 3,
  "B-": 2.7,
  BC: 2.5,
  "C+": 2.3,
  C: 2,
  D: 1,
  E: 0,
};

export type GradeScale = "LETTER_AB" | "PLUS_MINUS";

export const SCALE_GRADES: Record<GradeScale, string[]> = {
  LETTER_AB: ["A", "AB", "B", "BC", "C", "D", "E"],
  PLUS_MINUS: ["A", "A-", "B+", "B", "B-", "C+", "C", "D", "E"],
};

export type Course = { id: string; name: string; code: string | null; credits: number; grade: string; position: number };
export type Semester = { id: string; number: number; label: string | null; courses: Course[] };

export const points = (grade: string) => GRADE_POINTS[grade] ?? 0;

/** IP = Σ(bobot × SKS) / Σ SKS. null bila belum ada mata kuliah. */
export function gpa(courses: Course[]) {
  const credits = courses.reduce((sum, c) => sum + c.credits, 0);
  const quality = courses.reduce((sum, c) => sum + points(c.grade) * c.credits, 0);
  return { credits, quality, value: credits ? quality / credits : null };
}

/** IP tiap semester + IPK kumulatif sampai semester tersebut. */
export function progression(semesters: Semester[]) {
  let credits = 0;
  let quality = 0;
  return semesters.map((semester) => {
    const ip = gpa(semester.courses);
    credits += ip.credits;
    quality += ip.quality;
    return { semester, ip: ip.value, credits: ip.credits, cumulative: credits ? quality / credits : null };
  });
}

/** Predikat kelulusan (Permendikbud): > 3,50 dengan pujian, 3,01–3,50 sangat memuaskan, 2,76–3,00 memuaskan. */
export function predicate(ipk: number | null) {
  if (ipk === null) return null;
  if (ipk > 3.5) return "cumlaude" as const;
  if (ipk > 3) return "veryGood" as const;
  if (ipk >= 2.76) return "good" as const;
  return "fair" as const;
}

/** Warna tingkat nilai — selalu disertai huruf mutunya, tidak hanya warna. */
export function gradeColor(grade: string) {
  const p = points(grade);
  if (p >= 3.5) return "var(--c-finance)";
  if (p >= 2.7) return "var(--c-tasks)";
  if (p >= 2) return "var(--c-journal)";
  return "var(--c-calendar)";
}

export const formatGpa = (value: number | null, locale: string) =>
  value === null ? "–" : value.toLocaleString(locale === "id" ? "id-ID" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
