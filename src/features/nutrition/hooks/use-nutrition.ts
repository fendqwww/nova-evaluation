"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { getNutrition } from "@/features/nutrition/server/get-nutrition.action";
import { createFoodAction } from "@/features/nutrition/server/create-food.action";
import { updateFoodAction } from "@/features/nutrition/server/update-food.action";
import { setFoodFavoriteAction } from "@/features/nutrition/server/set-food-favorite.action";
import { deleteFoodAction } from "@/features/nutrition/server/delete-food.action";
import { createEntryAction } from "@/features/nutrition/server/create-entry.action";
import { updateEntryAction } from "@/features/nutrition/server/update-entry.action";
import { deleteEntryAction } from "@/features/nutrition/server/delete-entry.action";
import { addWaterAction } from "@/features/nutrition/server/add-water.action";
import { setGoalAction } from "@/features/nutrition/server/set-goal.action";
import { createTemplateAction } from "@/features/nutrition/server/create-template.action";
import { updateTemplateAction } from "@/features/nutrition/server/update-template.action";
import { deleteTemplateAction } from "@/features/nutrition/server/delete-template.action";
import { applyTemplateAction } from "@/features/nutrition/server/apply-template.action";
import { dashboardQueryKey } from "@/features/dashboard/hooks/use-dashboard-data";
import type { MealSlot, NutritionSnapshot } from "@/features/nutrition/types";
import type { FoodDraft, GoalDraft, TemplateDraft } from "@/features/nutrition/schemas";

export function nutritionQueryKey(rawInitData: string | undefined) {
  return ["nutrition", rawInitData] as const;
}

/**
 * The nutrition snapshot, plus the one mutation that has to feel instant.
 *
 * Adding water is the interaction that happens a dozen times a day between
 * other things — the same role logging a set plays for Workouts — so it is
 * optimistic: the cache moves first and rolls back if the write fails. Every
 * other mutation (foods, entries, templates, the goal) happens inside a modal
 * where a short pending state is honest, so those call refresh() on success
 * the same way WorkoutFormModal does.
 *
 * refresh() also invalidates the Dashboard: nutrition feeds the Life Score,
 * which is computed server-side on every fetch, so logging a meal here must
 * not leave a stale score sitting in the other tab's cache.
 */
export function useNutrition() {
  const rawInitData = useRawInitData();
  const queryClient = useQueryClient();
  const key = nutritionQueryKey(rawInitData);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getNutrition(rawInitData),
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: key });
    void queryClient.invalidateQueries({ queryKey: dashboardQueryKey(rawInitData) });
  }

  async function applyOptimistic(update: (snapshot: NutritionSnapshot) => NutritionSnapshot) {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<NutritionSnapshot>(key);
    if (previous) queryClient.setQueryData<NutritionSnapshot>(key, update(previous));
    return { previous };
  }

  function restore(context: { previous?: NutritionSnapshot } | undefined) {
    if (context?.previous) queryClient.setQueryData(key, context.previous);
  }

  const water = useMutation({
    mutationFn: addWaterAction,
    onMutate: ({ day, deltaMl }) =>
      applyOptimistic((snapshot) => {
        const existing = snapshot.water.find((row) => row.day === day);
        const amountMl = Math.max(0, (existing?.amountMl ?? 0) + deltaMl);

        return {
          ...snapshot,
          water: existing
            ? snapshot.water.map((row) => (row.day === day ? { ...row, amountMl } : row))
            : [...snapshot.water, { day, amountMl }],
        };
      }),
    onError: (_error, _variables, context) => restore(context),
    onSettled: refresh,
  });

  const food = useMutation({ mutationFn: createFoodAction, onSuccess: refresh });
  const foodEdit = useMutation({ mutationFn: updateFoodAction, onSuccess: refresh });
  const foodFavorite = useMutation({ mutationFn: setFoodFavoriteAction, onSuccess: refresh });
  const foodDelete = useMutation({ mutationFn: deleteFoodAction, onSuccess: refresh });

  const entryCreate = useMutation({ mutationFn: createEntryAction, onSuccess: refresh });
  const entryUpdate = useMutation({ mutationFn: updateEntryAction, onSuccess: refresh });
  const entryDelete = useMutation({ mutationFn: deleteEntryAction, onSuccess: refresh });

  const goalSet = useMutation({ mutationFn: setGoalAction, onSuccess: refresh });

  const templateCreate = useMutation({ mutationFn: createTemplateAction, onSuccess: refresh });
  const templateUpdate = useMutation({ mutationFn: updateTemplateAction, onSuccess: refresh });
  const templateDelete = useMutation({ mutationFn: deleteTemplateAction, onSuccess: refresh });
  const templateApply = useMutation({ mutationFn: applyTemplateAction, onSuccess: refresh });

  const snapshot = query.data;

  return {
    foods: snapshot?.foods ?? [],
    entries: snapshot?.entries ?? [],
    water: snapshot?.water ?? [],
    templates: snapshot?.templates ?? [],
    goal: snapshot?.goal ?? { calories: 0, proteinG: 0, fatG: 0, carbsG: 0, waterMl: 2000 },
    today: snapshot?.today ?? "",
    windowStart: snapshot?.windowStart ?? "",
    isPending: query.isPending,
    isError: query.isError,
    retry: () => void query.refetch(),
    refresh,

    addWater: (day: CalendarDay, deltaMl: number) => water.mutate({ rawInitData, day, deltaMl }),

    createFood: (draft: FoodDraft) => food.mutateAsync({ rawInitData, draft }),
    updateFood: (foodId: string, draft: FoodDraft) =>
      foodEdit.mutateAsync({ rawInitData, foodId, draft }),
    setFoodFavorite: (foodId: string, isFavorite: boolean) =>
      foodFavorite.mutate({ rawInitData, foodId, isFavorite }),
    deleteFood: (foodId: string) => foodDelete.mutateAsync({ rawInitData, foodId }),

    createEntry: (draft: {
      foodId: string;
      mealSlot: MealSlot;
      day: CalendarDay;
      amountG: number;
    }) => entryCreate.mutateAsync({ rawInitData, draft }),
    updateEntry: (entryId: string, amountG: number) =>
      entryUpdate.mutateAsync({ rawInitData, entryId, amountG }),
    deleteEntry: (entryId: string) => entryDelete.mutate({ rawInitData, entryId }),

    setGoal: (draft: GoalDraft) => goalSet.mutateAsync({ rawInitData, draft }),

    createTemplate: (draft: TemplateDraft) => templateCreate.mutateAsync({ rawInitData, draft }),
    updateTemplate: (templateId: string, draft: TemplateDraft) =>
      templateUpdate.mutateAsync({ rawInitData, templateId, draft }),
    deleteTemplate: (templateId: string) =>
      templateDelete.mutateAsync({ rawInitData, templateId }),
    applyTemplate: (templateId: string, mealSlot: MealSlot, day: CalendarDay) =>
      templateApply.mutateAsync({ rawInitData, templateId, mealSlot, day }),
  };
}
