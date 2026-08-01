"use client";

import { useQuery } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { getPhotoImageAction } from "@/features/appearance/server/get-photo-image.action";

/**
 * One photo's full-resolution bytes, fetched only when something actually shows
 * it at full size.
 *
 * Cached under its own key rather than folded into the section snapshot, which
 * is the entire reason the gallery is affordable: flipping between two shots in
 * the До/После view re-reads the cache instead of the database, and a user who
 * never opens a photo never pays for one.
 *
 * `staleTime: Infinity` because these bytes are immutable — a photo's image is
 * never edited, only its caption and area are (see updatePhotoMeta), so there
 * is nothing a refetch could discover.
 */
export function usePhotoImage(photoId: string | null) {
  const rawInitData = useRawInitData();

  const query = useQuery({
    queryKey: ["appearance-photo", rawInitData, photoId] as const,
    queryFn: () => getPhotoImageAction({ rawInitData, photoId: photoId as string }),
    enabled: photoId !== null,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });

  return {
    imageData: query.data?.imageData ?? null,
    isPending: photoId !== null && query.isPending,
    isError: query.isError,
  };
}
