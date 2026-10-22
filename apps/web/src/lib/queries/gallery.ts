"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";

export type Photo = {
  id: string;
  url: string;
  width: number;
  height: number;
  caption: string | null;
  takenAt: string | null;
  createdAt: string;
  albumId: string | null;
};

export type Album = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  count: number;
  cover: Photo[];
};

type PhotoPage = { photos: Photo[]; nextCursor: string | null; total: number | null };

export const galleryKeys = {
  photos: ["photos"] as const,
  list: (albumId: string | null) => ["photos", "list", albumId] as const,
  recent: ["photos", "recent"] as const,
  albums: ["albums"] as const,
};

export function usePhotos(albumId: string | null) {
  const { call, ready } = useApi();
  return useInfiniteQuery({
    queryKey: galleryKeys.list(albumId),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "60" });
      if (albumId) params.set("albumId", albumId);
      if (pageParam) params.set("cursor", pageParam);
      return call<PhotoPage>(`/photos?${params}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: ready,
    placeholderData: keepPreviousData,
  });
}

export function useRecentPhotos(limit = 6) {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: galleryKeys.recent,
    queryFn: () => call<PhotoPage>(`/photos?limit=${limit}`),
    enabled: ready,
  });
}

export function useAlbums() {
  const { call, ready } = useApi();
  return useQuery({
    queryKey: galleryKeys.albums,
    queryFn: () => call<{ albums: Album[] }>("/albums").then((r) => r.albums),
    enabled: ready,
  });
}

function useInvalidateGallery() {
  const client = useQueryClient();
  return () => Promise.all([client.invalidateQueries({ queryKey: galleryKeys.photos }), client.invalidateQueries({ queryKey: galleryKeys.albums })]);
}

/** Hapus foto dari semua daftar yang ter-cache secara langsung (optimistic). */
function useRemoveFromCache() {
  const client = useQueryClient();
  return (ids: string[]) =>
    client.setQueriesData<InfiniteData<PhotoPage>>({ queryKey: ["photos", "list"] }, (old) =>
      old && {
        ...old,
        pages: old.pages.map((p) => ({ ...p, photos: p.photos.filter((photo) => !ids.includes(photo.id)), total: p.total && p.total - ids.length })),
      },
    );
}

export function useUpdatePhoto() {
  const { call } = useApi();
  const client = useQueryClient();
  const invalidate = useInvalidateGallery();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; caption?: string | null; albumId?: string | null }) =>
      call<{ photo: Photo }>(`/photos/${id}`, { method: "PATCH", body }).then((r) => r.photo),
    onSuccess: (photo) =>
      client.setQueriesData<InfiniteData<PhotoPage>>({ queryKey: ["photos", "list"] }, (old) =>
        old && { ...old, pages: old.pages.map((p) => ({ ...p, photos: p.photos.map((x) => (x.id === photo.id ? photo : x)) })) },
      ),
    onSettled: invalidate,
  });
}

export function useDeletePhotos() {
  const { call } = useApi();
  const remove = useRemoveFromCache();
  const invalidate = useInvalidateGallery();
  return useMutation({
    mutationFn: (ids: string[]) =>
      ids.length === 1 ? call<void>(`/photos/${ids[0]}`, { method: "DELETE" }) : call("/photos/bulk", { method: "POST", body: { action: "delete", ids } }),
    onMutate: remove,
    onSettled: invalidate,
  });
}

export function useMovePhotos() {
  const { call } = useApi();
  const invalidate = useInvalidateGallery();
  return useMutation({
    mutationFn: ({ ids, albumId }: { ids: string[]; albumId: string | null }) =>
      call("/photos/bulk", { method: "POST", body: { action: "move", ids, albumId } }),
    onSettled: invalidate,
  });
}

export function useSaveAlbum() {
  const { call } = useApi();
  const invalidate = useInvalidateGallery();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; name: string; description?: string | null }) =>
      call<{ album: Album }>(id ? `/albums/${id}` : "/albums", { method: id ? "PATCH" : "POST", body }).then((r) => r.album),
    onSettled: invalidate,
  });
}

export function useDeleteAlbum() {
  const { call } = useApi();
  const invalidate = useInvalidateGallery();
  return useMutation({
    mutationFn: ({ id, withPhotos }: { id: string; withPhotos: boolean }) => call<void>(`/albums/${id}?withPhotos=${withPhotos}`, { method: "DELETE" }),
    onSettled: invalidate,
  });
}
