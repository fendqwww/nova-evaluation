import type { MealSlot, NutritionFoodItem } from "@/features/nutrition/types";

/**
 * A curated set of popular dishes, applied in one tap the same way a saved
 * NutritionMealTemplate is. Not a shared food database — see the note on
 * NutritionFood in schema.prisma for why this app deliberately has none.
 * Applying a preset seeds one ordinary NutritionFood row under the user's own
 * catalogue the first time (see applyQuickTemplate in nutrition.repository.ts);
 * every later log of the same dish reuses that row rather than creating a
 * duplicate, and the user can correct its macros exactly like any food they
 * typed in by hand.
 *
 * Macros are typical values for a home-cooked portion, not a lab measurement —
 * meant to be corrected after logging, the same way a Gemini photo estimate is.
 *
 * ПОЧЕМУ КАТАЛОГ ВЫРОС С СЕМНАДЦАТИ БЛЮД ДО СОРОКА С ЛИШНИМ. Семнадцати хватало
 * на демонстрацию механизма и не хватало на неделю жизни: ужин был представлен
 * одним стейком, перекус — бананом, яблоком и коктейлем. Человек, открывший
 * список в семь вечера, своего ужина там не находил и уходил заполнять форму
 * руками — то есть попадал ровно в ту ручную работу, ради ухода от которой
 * список и существует. Набор ниже покрывает обычную русскую неделю: каши и
 * творог утром, супы, гарниры с мясом и салаты днём, белковое и лёгкое вечером,
 * орехи, фрукты и молочное между.
 *
 * ID НАВСЕГДА. Сопоставление с уже созданными NutritionFood идёт по имени
 * (applyQuickTemplate), а id живут в адресах и в сценариях питания. И то
 * и другое у существующих блюд менять нельзя — только добавлять новые.
 */
export interface QuickMealTemplate {
  id: string;
  name: string;
  mealSlot: MealSlot;
  /** Grams (or millilitres for the shake), for the default portion size. */
  amountG: number;
  caloriesPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
  /**
   * Из чего блюдо состоит.
   *
   * Чисто описательное поле: в NutritionFood оно не едет (см.
   * quickTemplateFoodDraft) и ни в один расчёт не входит. Нужно затем, что
   * «Паста болоньезе · 610 ккал» — это две цифры и никакого ответа на вопрос
   * «а что там внутри», а без ответа человек не может ни сверить с тем, что у
   * него на тарелке, ни приготовить то же самое.
   */
  ingredients: string[];
}

export const QUICK_MEAL_TEMPLATES: QuickMealTemplate[] = [
  /* ---------------------------------------------------------- завтраки --- */
  { id: "oatmeal", name: "Овсянка", mealSlot: "breakfast", amountG: 300, caloriesPer100: 88, proteinPer100: 3, fatPer100: 1.5, carbsPer100: 15, ingredients: ["Овсяные хлопья", "Вода или молоко", "Щепотка соли"] },
  { id: "omelette", name: "Омлет", mealSlot: "breakfast", amountG: 200, caloriesPer100: 154, proteinPer100: 11, fatPer100: 11, carbsPer100: 2, ingredients: ["Яйца 3 шт", "Молоко", "Масло"] },
  { id: "fried-eggs", name: "Яичница", mealSlot: "breakfast", amountG: 150, caloriesPer100: 196, proteinPer100: 13, fatPer100: 15, carbsPer100: 1, ingredients: ["Яйца 2–3 шт", "Масло"] },
  { id: "boiled-eggs", name: "Варёные яйца", mealSlot: "breakfast", amountG: 120, caloriesPer100: 155, proteinPer100: 13, fatPer100: 11, carbsPer100: 1, ingredients: ["Яйца 2 шт"] },
  { id: "cottage-cheese", name: "Творог", mealSlot: "breakfast", amountG: 150, caloriesPer100: 121, proteinPer100: 17, fatPer100: 5, carbsPer100: 3, ingredients: ["Творог 5%"] },
  { id: "cottage-berries", name: "Творог с ягодами", mealSlot: "breakfast", amountG: 200, caloriesPer100: 110, proteinPer100: 14, fatPer100: 4.5, carbsPer100: 6, ingredients: ["Творог 5%", "Ягоды", "Мёд по вкусу"] },
  { id: "syrniki", name: "Сырники", mealSlot: "breakfast", amountG: 180, caloriesPer100: 220, proteinPer100: 14, fatPer100: 9, carbsPer100: 20, ingredients: ["Творог", "Яйцо", "Мука", "Масло для жарки"] },
  { id: "yogurt", name: "Йогурт", mealSlot: "breakfast", amountG: 200, caloriesPer100: 66, proteinPer100: 5, fatPer100: 3.2, carbsPer100: 4.7, ingredients: ["Натуральный йогурт"] },
  { id: "granola-milk", name: "Гранола с молоком", mealSlot: "breakfast", amountG: 250, caloriesPer100: 180, proteinPer100: 6, fatPer100: 6, carbsPer100: 25, ingredients: ["Гранола", "Молоко"] },
  { id: "buckwheat-milk", name: "Гречка на молоке", mealSlot: "breakfast", amountG: 280, caloriesPer100: 105, proteinPer100: 4, fatPer100: 2.5, carbsPer100: 17, ingredients: ["Гречка", "Молоко"] },
  { id: "rice-porridge", name: "Рисовая каша", mealSlot: "breakfast", amountG: 280, caloriesPer100: 97, proteinPer100: 2.5, fatPer100: 2, carbsPer100: 18, ingredients: ["Рис", "Молоко", "Сахар по вкусу"] },
  { id: "protein-pancakes", name: "Протеиновые панкейки", mealSlot: "breakfast", amountG: 200, caloriesPer100: 175, proteinPer100: 15, fatPer100: 5, carbsPer100: 17, ingredients: ["Овсяная мука", "Протеин", "Яйцо", "Молоко"] },
  { id: "avocado-toast", name: "Тост с авокадо", mealSlot: "breakfast", amountG: 120, caloriesPer100: 190, proteinPer100: 5, fatPer100: 11, carbsPer100: 18, ingredients: ["Цельнозерновой хлеб", "Авокадо", "Соль, перец"] },

  /* ------------------------------------------------------------- обеды --- */
  { id: "rice-chicken", name: "Рис + курица", mealSlot: "lunch", amountG: 350, caloriesPer100: 165, proteinPer100: 12, fatPer100: 4, carbsPer100: 20, ingredients: ["Рис", "Куриное филе", "Масло"] },
  { id: "buckwheat-chicken", name: "Гречка + курица", mealSlot: "lunch", amountG: 350, caloriesPer100: 150, proteinPer100: 13, fatPer100: 3, carbsPer100: 18, ingredients: ["Гречка", "Куриное филе"] },
  { id: "potato-chicken", name: "Картофель + курица", mealSlot: "lunch", amountG: 350, caloriesPer100: 140, proteinPer100: 12, fatPer100: 3, carbsPer100: 16, ingredients: ["Картофель", "Куриное филе"] },
  { id: "turkey-rice", name: "Индейка + рис", mealSlot: "lunch", amountG: 350, caloriesPer100: 150, proteinPer100: 13, fatPer100: 3, carbsPer100: 18, ingredients: ["Рис", "Филе индейки"] },
  { id: "beef-buckwheat", name: "Говядина + гречка", mealSlot: "lunch", amountG: 350, caloriesPer100: 160, proteinPer100: 13, fatPer100: 6, carbsPer100: 15, ingredients: ["Гречка", "Говядина", "Лук, морковь"] },
  { id: "fish-rice", name: "Рыба + рис", mealSlot: "lunch", amountG: 350, caloriesPer100: 155, proteinPer100: 14, fatPer100: 3, carbsPer100: 18, ingredients: ["Рис", "Белая рыба"] },
  { id: "salmon-veg", name: "Лосось + овощи", mealSlot: "lunch", amountG: 300, caloriesPer100: 170, proteinPer100: 17, fatPer100: 10, carbsPer100: 4, ingredients: ["Лосось", "Брокколи", "Оливковое масло"] },
  { id: "pasta-chicken", name: "Паста с курицей", mealSlot: "lunch", amountG: 350, caloriesPer100: 165, proteinPer100: 11, fatPer100: 5, carbsPer100: 20, ingredients: ["Паста", "Куриное филе", "Сливки"] },
  { id: "pasta-bolognese", name: "Паста болоньезе", mealSlot: "lunch", amountG: 350, caloriesPer100: 175, proteinPer100: 9, fatPer100: 6, carbsPer100: 21, ingredients: ["Паста", "Фарш", "Томатный соус"] },
  { id: "mac-cheese", name: "Макароны + сыр", mealSlot: "lunch", amountG: 300, caloriesPer100: 195, proteinPer100: 8, fatPer100: 9, carbsPer100: 20, ingredients: ["Макароны", "Сыр", "Масло"] },
  { id: "pilaf", name: "Плов", mealSlot: "lunch", amountG: 300, caloriesPer100: 190, proteinPer100: 9, fatPer100: 7, carbsPer100: 22, ingredients: ["Рис", "Мясо", "Морковь", "Лук"] },
  { id: "cutlets-potato", name: "Котлеты + картофель", mealSlot: "lunch", amountG: 320, caloriesPer100: 195, proteinPer100: 11, fatPer100: 11, carbsPer100: 14, ingredients: ["Фарш", "Картофель", "Лук"] },
  { id: "soup-chicken", name: "Куриный суп", mealSlot: "lunch", amountG: 350, caloriesPer100: 55, proteinPer100: 4, fatPer100: 2, carbsPer100: 5, ingredients: ["Куриный бульон", "Курица", "Картофель", "Морковь"] },
  { id: "borscht", name: "Борщ", mealSlot: "lunch", amountG: 350, caloriesPer100: 60, proteinPer100: 2.5, fatPer100: 3, carbsPer100: 6, ingredients: ["Свёкла", "Капуста", "Мясо", "Картофель"] },
  { id: "chicken-breast", name: "Куриная грудка", mealSlot: "lunch", amountG: 150, caloriesPer100: 165, proteinPer100: 31, fatPer100: 3.6, carbsPer100: 0, ingredients: ["Куриное филе", "Специи"] },
  { id: "salad", name: "Салат", mealSlot: "lunch", amountG: 200, caloriesPer100: 60, proteinPer100: 1.5, fatPer100: 4, carbsPer100: 5, ingredients: ["Овощи", "Зелень", "Растительное масло"] },
  { id: "greek-salad", name: "Греческий салат", mealSlot: "lunch", amountG: 250, caloriesPer100: 105, proteinPer100: 3.5, fatPer100: 8, carbsPer100: 5, ingredients: ["Огурцы", "Помидоры", "Фета", "Оливки", "Оливковое масло"] },
  { id: "caesar", name: "Салат «Цезарь»", mealSlot: "lunch", amountG: 250, caloriesPer100: 190, proteinPer100: 11, fatPer100: 13, carbsPer100: 6, ingredients: ["Курица", "Салат романо", "Сухарики", "Соус", "Пармезан"] },

  /* ------------------------------------------------------------- ужины --- */
  { id: "steak", name: "Стейк", mealSlot: "dinner", amountG: 200, caloriesPer100: 250, proteinPer100: 26, fatPer100: 16, carbsPer100: 0, ingredients: ["Говядина", "Соль, перец"] },
  { id: "baked-fish", name: "Запечённая рыба", mealSlot: "dinner", amountG: 220, caloriesPer100: 130, proteinPer100: 21, fatPer100: 5, carbsPer100: 0, ingredients: ["Белая рыба", "Лимон", "Специи"] },
  { id: "chicken-veg", name: "Курица + овощи", mealSlot: "dinner", amountG: 300, caloriesPer100: 115, proteinPer100: 16, fatPer100: 4, carbsPer100: 5, ingredients: ["Куриное филе", "Брокколи", "Кабачок"] },
  { id: "chicken-stew", name: "Тушёная курица", mealSlot: "dinner", amountG: 280, caloriesPer100: 135, proteinPer100: 17, fatPer100: 6, carbsPer100: 3, ingredients: ["Курица", "Лук", "Морковь", "Томат"] },
  { id: "turkey-salad", name: "Индейка + салат", mealSlot: "dinner", amountG: 280, caloriesPer100: 120, proteinPer100: 17, fatPer100: 4.5, carbsPer100: 3, ingredients: ["Филе индейки", "Салат", "Огурцы", "Масло"] },
  { id: "omelette-veg", name: "Омлет с овощами", mealSlot: "dinner", amountG: 250, caloriesPer100: 120, proteinPer100: 10, fatPer100: 8, carbsPer100: 3, ingredients: ["Яйца", "Помидоры", "Шпинат"] },
  { id: "shrimp-salad", name: "Салат с креветками", mealSlot: "dinner", amountG: 250, caloriesPer100: 95, proteinPer100: 12, fatPer100: 4, carbsPer100: 3, ingredients: ["Креветки", "Салат", "Авокадо", "Лимон"] },
  { id: "cottage-cheese-night", name: "Творог на ночь", mealSlot: "dinner", amountG: 180, caloriesPer100: 101, proteinPer100: 18, fatPer100: 2, carbsPer100: 3, ingredients: ["Творог 2%"] },
  { id: "veg-stew", name: "Овощное рагу", mealSlot: "dinner", amountG: 300, caloriesPer100: 70, proteinPer100: 2, fatPer100: 4, carbsPer100: 7, ingredients: ["Кабачок", "Баклажан", "Перец", "Томат"] },

  /* ---------------------------------------------------------- перекусы --- */
  { id: "banana", name: "Банан", mealSlot: "snack", amountG: 120, caloriesPer100: 96, proteinPer100: 1.5, fatPer100: 0.2, carbsPer100: 21, ingredients: ["Банан 1 шт"] },
  { id: "apple", name: "Яблоко", mealSlot: "snack", amountG: 150, caloriesPer100: 47, proteinPer100: 0.4, fatPer100: 0.4, carbsPer100: 10, ingredients: ["Яблоко 1 шт"] },
  { id: "orange", name: "Апельсин", mealSlot: "snack", amountG: 200, caloriesPer100: 43, proteinPer100: 0.9, fatPer100: 0.2, carbsPer100: 8.1, ingredients: ["Апельсин 1 шт"] },
  { id: "berries", name: "Ягоды", mealSlot: "snack", amountG: 150, caloriesPer100: 45, proteinPer100: 1, fatPer100: 0.4, carbsPer100: 9, ingredients: ["Клубника, черника или малина"] },
  { id: "nuts", name: "Орехи", mealSlot: "snack", amountG: 30, caloriesPer100: 610, proteinPer100: 17, fatPer100: 55, carbsPer100: 13, ingredients: ["Ассорти орехов, горсть"] },
  { id: "almonds", name: "Миндаль", mealSlot: "snack", amountG: 30, caloriesPer100: 600, proteinPer100: 21, fatPer100: 53, carbsPer100: 11, ingredients: ["Миндаль, горсть"] },
  { id: "walnuts", name: "Грецкие орехи", mealSlot: "snack", amountG: 30, caloriesPer100: 654, proteinPer100: 15, fatPer100: 65, carbsPer100: 7, ingredients: ["Грецкие орехи, горсть"] },
  { id: "dried-fruits", name: "Сухофрукты", mealSlot: "snack", amountG: 40, caloriesPer100: 280, proteinPer100: 2.5, fatPer100: 0.5, carbsPer100: 68, ingredients: ["Курага, чернослив, финики"] },
  { id: "protein-shake", name: "Протеиновый коктейль", mealSlot: "snack", amountG: 300, caloriesPer100: 105, proteinPer100: 20, fatPer100: 1.5, carbsPer100: 4, ingredients: ["Протеин", "Молоко или вода"] },
  { id: "protein-bar", name: "Протеиновый батончик", mealSlot: "snack", amountG: 50, caloriesPer100: 350, proteinPer100: 30, fatPer100: 10, carbsPer100: 30, ingredients: ["Протеиновый батончик 1 шт"] },
  { id: "kefir", name: "Кефир", mealSlot: "snack", amountG: 250, caloriesPer100: 53, proteinPer100: 3, fatPer100: 2.5, carbsPer100: 4, ingredients: ["Кефир 2.5%"] },
  { id: "cheese", name: "Сыр", mealSlot: "snack", amountG: 40, caloriesPer100: 350, proteinPer100: 25, fatPer100: 27, carbsPer100: 0, ingredients: ["Твёрдый сыр"] },
  { id: "peanut-toast", name: "Тост с арахисовой пастой", mealSlot: "snack", amountG: 60, caloriesPer100: 300, proteinPer100: 11, fatPer100: 17, carbsPer100: 25, ingredients: ["Хлеб", "Арахисовая паста"] },
];

export function quickTemplateById(id: string): QuickMealTemplate | undefined {
  return QUICK_MEAL_TEMPLATES.find((template) => template.id === id);
}

/** Ккал в порции по умолчанию — цифра, которую видно на плитке. */
export function quickTemplateCalories(template: QuickMealTemplate): number {
  return Math.round((template.caloriesPer100 * template.amountG) / 100);
}

/** Граммы белка в порции по умолчанию — на нём строится подбор меню. */
export function quickTemplateProtein(template: QuickMealTemplate): number {
  return Math.round((template.proteinPer100 * template.amountG) / 100);
}

/** The macro fields a NutritionFood row needs, out of a preset. */
export function quickTemplateFoodDraft(
  template: QuickMealTemplate,
): Pick<NutritionFoodItem, "name" | "caloriesPer100" | "proteinPer100" | "fatPer100" | "carbsPer100"> {
  return {
    name: template.name,
    caloriesPer100: template.caloriesPer100,
    proteinPer100: template.proteinPer100,
    fatPer100: template.fatPer100,
    carbsPer100: template.carbsPer100,
  };
}
