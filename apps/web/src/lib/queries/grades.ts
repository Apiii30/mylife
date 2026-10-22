"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import type { Course, GradeScale, Semester } from "@/lib/grades";

type GradesData = { scale: GradeScale; semesters: Semester[] };
export type CourseInput = { name: string; code?: string | null; credits: number; grade: string };

const KEY = ["grades"] as const;

export function useGrades() {
  const { call, ready } = useApi();
  return useQuery({ queryKey: KEY, queryFn: () => call<GradesData>("/grades"), enabled: ready });
}

/** Ubah cache dulu (optimistic) agar ganti nilai/SKS terasa instan, lalu sinkron dengan server. */
function useGradesMutation<V, R = unknown>(fn: (vars: V) => Promise<R>, update?: (data: GradesData, vars: V) => GradesData) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onMutate: async (vars: V) => {
      await client.cancelQueries({ queryKey: KEY });
      const previous = client.getQueryData<GradesData>(KEY);
      if (previous && update) client.setQueryData(KEY, update(previous, vars));
      return { previous };
    },
    onError: (_e, _v, context) => context?.previous && client.setQueryData(KEY, context.previous),
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

const mapCourses = (data: GradesData, fn: (courses: Course[], semesterId: string) => Course[]) => ({
  ...data,
  semesters: data.semesters.map((s) => ({ ...s, courses: fn(s.courses, s.id) })),
});

export function useCreateSemester() {
  const { call } = useApi();
  return useGradesMutation((body: { number?: number; label?: string | null }) =>
    call<{ semester: Semester }>("/grades/semesters", { method: "POST", body }).then((r) => r.semester),
  );
}

export function useUpdateSemester() {
  const { call } = useApi();
  return useGradesMutation(
    ({ id, ...body }: { id: string; number?: number; label?: string | null }) => call(`/grades/semesters/${id}`, { method: "PATCH", body }),
    (data, { id, ...body }) => ({ ...data, semesters: data.semesters.map((s) => (s.id === id ? { ...s, ...body } : s)) }),
  );
}

export function useDeleteSemester() {
  const { call } = useApi();
  return useGradesMutation(
    (id: string) => call(`/grades/semesters/${id}`, { method: "DELETE" }),
    (data, id) => ({ ...data, semesters: data.semesters.filter((s) => s.id !== id) }),
  );
}

export function useAddCourse() {
  const { call } = useApi();
  return useGradesMutation(
    ({ semesterId, ...body }: CourseInput & { semesterId: string }) =>
      call<{ course: Course }>(`/grades/semesters/${semesterId}/courses`, { method: "POST", body }).then((r) => r.course),
    (data, { semesterId, ...body }) =>
      mapCourses(data, (courses, id) => (id === semesterId ? [...courses, { id: `tmp-${Date.now()}`, position: courses.length, code: null, ...body }] : courses)),
  );
}

export function useUpdateCourse() {
  const { call } = useApi();
  return useGradesMutation(
    ({ id, ...body }: Partial<CourseInput> & { id: string }) => call(`/grades/courses/${id}`, { method: "PATCH", body }),
    (data, { id, ...body }) => mapCourses(data, (courses) => courses.map((c) => (c.id === id ? { ...c, ...body } : c))),
  );
}

export function useDeleteCourse() {
  const { call } = useApi();
  return useGradesMutation(
    (id: string) => call(`/grades/courses/${id}`, { method: "DELETE" }),
    (data, id) => mapCourses(data, (courses) => courses.filter((c) => c.id !== id)),
  );
}
