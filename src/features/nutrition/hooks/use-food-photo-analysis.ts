"use client";

import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { prepareImage } from "@/shared/lib/prepare-image";
import { haptics } from "@/shared/lib/haptics";
import { analyzeFoodPhotoAction } from "@/features/nutrition/server/analyze-food-photo.action";
import type { FoodAnalysis } from "@/ai/types";

/**
 * Разбор еды по фото — один раз на всё приложение.
 *
 * Логика жила внутри FoodFormModal, и это было нормально ровно до тех пор, пока
 * фото оставалось запасным сценарием внутри формы создания продукта. Теперь
 * разбор по фото — главная кнопка раздела «Питание», то есть у него два места
 * вызова, и второй экземпляр той же мутации означал бы два набора лимитов, два
 * разных текста ошибки и две вибрации, расходящиеся при первой же правке.
 *
 * Хук не рендерит ничего и не знает про модальные окна: он принимает файл и
 * возвращает состояние разбора. Кто открыл камеру — его дело.
 */

/** Размер под vision-запрос Gemini, не под хранение: кадр никогда не пишется в строку. */
const PHOTO_MAX_EDGE = 1024;
const PHOTO_QUALITY = 0.72;
const PHOTO_MAX_CHARS = 1_400_000;

/**
 * Разбор целой порции переводится в значения на 100 г — именно их хранит
 * NutritionFood (см. заметку про portionGrams в ai/types.ts).
 */
export function per100gFrom(analysis: FoodAnalysis) {
  const factor = 100 / analysis.portionGrams;
  return {
    caloriesPer100: Math.round(analysis.calories * factor),
    proteinPer100: Math.round(analysis.proteinG * factor * 10) / 10,
    fatPer100: Math.round(analysis.fatG * factor * 10) / 10,
    carbsPer100: Math.round(analysis.carbsG * factor * 10) / 10,
  };
}

export interface FoodPhotoAnalysisState {
  analyze: (file: File) => void;
  isPending: boolean;
  analysis: FoodAnalysis | null;
  /**
   * Сообщение о лимите пишет сервер (features/usage/lib/format.ts): он знает,
   * какая именно квота кончилась и когда пополнится, а клиент из двух чисел
   * этого не восстановит.
   */
  limitMessage: string | null;
  errorMessage: string | null;
  reset: () => void;
}

export function useFoodPhotoAnalysis(
  onAnalyzed?: (analysis: FoodAnalysis) => void,
): FoodPhotoAnalysisState {
  const rawInitData = useRawInitData();

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const prepared = await prepareImage(file, {
        maxEdge: PHOTO_MAX_EDGE,
        quality: PHOTO_QUALITY,
        maxChars: PHOTO_MAX_CHARS,
      });
      return analyzeFoodPhotoAction({ rawInitData, imageData: prepared.dataUrl });
    },
    onSuccess: (result) => {
      if (result.ok) {
        // Отклик по факту ответа модели, а не по факту нажатия: разбор идёт
        // несколько секунд, и вибрация — единственное, что сообщает о готовности
        // человеку, уже отведшему взгляд от экрана.
        haptics.success();
        onAnalyzed?.(result.analysis);
        return;
      }
      haptics.error();
    },
    onError: () => haptics.error(),
  });

  const result = mutation.data;

  return {
    analyze: mutation.mutate,
    isPending: mutation.isPending,
    analysis: result?.ok ? result.analysis : null,
    limitMessage: result && !result.ok && result.reason === "limit" ? result.message : null,
    errorMessage: mutation.isError
      ? mutation.error instanceof Error
        ? mutation.error.message
        : "Не удалось обработать фото."
      : result && !result.ok && result.reason === "error"
        ? result.message
        : null,
    reset: mutation.reset,
  };
}
