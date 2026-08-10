"use client";

import { useState } from "react";
import { Settings2, Plus, Salad } from "lucide-react";
import { useAddIntent, useAddIntentParam } from "@/shared/lib/use-add-intent";
import { isMealSlot } from "@/features/nutrition/lib/meal-slot";
import { useTelegramSession } from "@/features/auth/hooks/use-telegram-session";
import type { ActivityLevel } from "@/features/nutrition/lib/targets";
import { HealthSectionTabs } from "@/components/health-section-tabs";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { useNutrition } from "@/features/nutrition/hooks/use-nutrition";
import { NutritionSkeleton } from "@/features/nutrition/components/nutrition-skeleton";
import { NutritionTabs, type NutritionTabId } from "@/features/nutrition/components/nutrition-tabs";
import { DayNavigator } from "@/features/nutrition/components/day-navigator";
import { MacroSummaryCard } from "@/features/nutrition/components/macro-summary-card";
import { MacroWhyCard } from "@/features/nutrition/components/macro-why-card";
import { WaterCard } from "@/features/nutrition/components/water-card";
import { MealGroupCard } from "@/features/nutrition/components/meal-group-card";
import { FoodPickerModal } from "@/features/nutrition/components/food-picker-modal";
import { FoodFormModal } from "@/features/nutrition/components/food-form-modal";
import { FoodCaptureCard } from "@/features/nutrition/components/food-capture-card";
import { LogEntryModal } from "@/features/nutrition/components/log-entry-modal";
import { FoodsList } from "@/features/nutrition/components/foods-list";
import { TemplatesList } from "@/features/nutrition/components/templates-list";
import { QuickTemplatesGrid } from "@/features/nutrition/components/quick-templates-grid";
import { TemplateFormModal } from "@/features/nutrition/components/template-form-modal";
import { GoalFormModal } from "@/features/nutrition/components/goal-form-modal";
import { NutritionStatsCard } from "@/features/nutrition/components/nutrition-stats-card";
import { dayProgress, entriesOnDay, groupByMeal } from "@/features/nutrition/lib/stats";
import { formatCalories } from "@/features/nutrition/lib/format";
import type { MealSlot, NutritionFoodItem, NutritionMealTemplate } from "@/features/nutrition/types";
import type { QuickMealTemplate } from "@/features/nutrition/lib/quick-templates";
import type { FoodAnalysis } from "@/ai/types";

/**
 * NOTE ON WHAT THIS SECTION DOES NOT DO. There is no shared food database and
 * no barcode scanner. A shared catalogue means shipping and maintaining
 * nutrition data that would be wrong for a meaningful share of real foods, and
 * a personal catalogue that starts empty and grows with favourites and
 * templates is the honest substitute — the same call WorkoutsView makes about
 * an exercise library, for the same reason.
 */
export function NutritionView() {
  const {
    foods,
    entries,
    water,
    templates,
    goal,
    today,
    windowStart,
    isPending,
    isError,
    retry,
    addWater,
    createFood,
    updateFood,
    setFoodFavorite,
    deleteEntry,
    createEntry,
    setGoal,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    applyQuickTemplate,
  } = useNutrition();

  // The body the calorie formula needs. Read from the session rather than
  // fetched again: it is the one snapshot every screen already waits on, and a
  // second query for four numbers that never change mid-session would be a
  // second answer to the same question.
  const { data: session } = useTelegramSession();
  const profile = session?.profile ?? null;

  const [tab, setTab] = useState<NutritionTabId>("diary");
  const [day, setDay] = useState<string | null>(null);

  const [pickerSlot, setPickerSlot] = useState<MealSlot | null>(null);
  // The meal the user was adding to when they jumped from the picker into
  // "create a new food" — kept separate from pickerSlot (which the food form
  // closes) so the food created there still knows where to be logged.
  const [targetSlot, setTargetSlot] = useState<MealSlot>("breakfast");
  const [pickedFood, setPickedFood] = useState<NutritionFoodItem | null>(null);
  const [foodFormOpen, setFoodFormOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<NutritionFoodItem | null>(null);
  const [pendingFoodName, setPendingFoodName] = useState("");
  /** Whether the food currently being created should open straight into logging. */
  const [logAfterCreate, setLogAfterCreate] = useState(false);
  /**
   * Разбор фото, сделанный до открытия формы — главной кнопкой раздела.
   * Форма получает его как начальные значения и открывается заполненной.
   */
  const [photoAnalysis, setPhotoAnalysis] = useState<FoodAnalysis | null>(null);
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NutritionMealTemplate | null>(null);

  const [pickerKey, setPickerKey] = useState(0);
  const [foodFormKey, setFoodFormKey] = useState(0);
  const [logKey, setLogKey] = useState(0);
  const [goalKey, setGoalKey] = useState(0);
  const [templateKey, setTemplateKey] = useState(0);

  const activeDay = day ?? today;
  const hasData = foods.length > 0 || entries.length > 0;

  /**
   * Arrived from the record sheet. Each intent opens the form the user already
   * chose, so the tap they made in the sheet is the last one they need — the
   * whole reason the sheet navigates with an intent rather than just linking
   * here.
   *
   * Derived rather than pushed into state by an effect, and cancelled by
   * `intentDismissed` so closing a form does not immediately reopen it.
   */
  const addIntent = useAddIntent();
  // Приём пищи, названный ссылкой из плана дня. Он же — начальный слот для
  // формы записи, поэтому важен именно на первом рендере, до открытия модалки.
  const intentSlot = useAddIntentParam("slot");
  const [intentDismissed, setIntentDismissed] = useState(false);
  const intentLive = addIntent !== null && today !== null && !intentDismissed;

  const isPickerVisible = pickerSlot !== null || (intentLive && addIntent === "food");
  const isFoodFormVisible = foodFormOpen || (intentLive && addIntent === "photo");

  /**
   * Куда писать выбранный продукт.
   *
   * Пока живёт интент из адреса, побеждает названный им приём пищи — по строке
   * «Ужин» в плане дня нажали именно ради ужина. Как только человек открыл
   * выбор сам, побеждает его собственный выбор слота. Значение выводится, а не
   * заталкивается в состояние эффектом, — то же правило, по которому здесь
   * устроен весь разбор интентов.
   */
  const effectiveSlot: MealSlot =
    pickerSlot ??
    (intentLive && intentSlot !== null && isMealSlot(intentSlot) ? intentSlot : targetSlot);

  const progress = today
    ? dayProgress(entries, water, goal, activeDay)
    : null;
  const meals = groupByMeal(entriesOnDay(entries, activeDay));

  function openPicker(slot: MealSlot) {
    setPickerSlot(slot);
    setTargetSlot(slot);
    setPickerKey((n) => n + 1);
  }

  /** From the picker's "create new" escape hatch — logs the food once it exists. */
  function openCreateFoodForSlot(name: string) {
    setEditingFood(null);
    setPendingFoodName(name);
    setLogAfterCreate(true);
    setPickerSlot(null);
    setFoodFormKey((n) => n + 1);
    setFoodFormOpen(true);
  }

  /** From the Foods tab — a catalogue addition with nothing to log afterwards. */
  function openCreateFood() {
    setEditingFood(null);
    setPendingFoodName("");
    setPhotoAnalysis(null);
    setLogAfterCreate(false);
    setFoodFormKey((n) => n + 1);
    setFoodFormOpen(true);
  }

  /**
   * Камера уже отработала — форма открывается с готовыми цифрами, и человеку
   * остаётся их проверить. `logAfterCreate` включён, потому что снимают еду,
   * чтобы её записать, а не чтобы пополнить каталог.
   */
  function openFormWithAnalysis(analysis: FoodAnalysis) {
    setEditingFood(null);
    setPendingFoodName("");
    setPhotoAnalysis(analysis);
    setLogAfterCreate(true);
    setFoodFormKey((n) => n + 1);
    setFoodFormOpen(true);
  }

  function openEditFood(food: NutritionFoodItem) {
    setEditingFood(food);
    setPendingFoodName("");
    setFoodFormKey((n) => n + 1);
    setFoodFormOpen(true);
  }

  function selectFood(food: NutritionFoodItem) {
    setPickedFood(food);
    setPickerSlot(null);
    setLogKey((n) => n + 1);
  }

  /** A food created from the picker's escape hatch goes straight to logging it. */
  async function handleFoodCreated(draft: {
    name: string;
    caloriesPer100: number;
    proteinPer100: number;
    fatPer100: number;
    carbsPer100: number;
  }) {
    const result = await createFood(draft);
    if (logAfterCreate) {
      setPickedFood({ ...draft, id: result.foodId, isFavorite: false, archivedAt: null });
      setLogKey((n) => n + 1);
    }
    return result;
  }

  async function applyTemplateToday(template: NutritionMealTemplate) {
    await applyTemplate(template.id, template.mealSlot, activeDay);
  }

  async function applyQuickTemplateToday(template: QuickMealTemplate) {
    await applyQuickTemplate(template.id, template.mealSlot, activeDay);
  }

  return (
    <PageContainer className="flex flex-col gap-4">
      <HealthSectionTabs active="nutrition" />

      <PageHeader
        title="Питание"
        subtitle={
          progress && progress.calories.value > 0
            ? `${formatCalories(progress.calories.value)}${
                progress.calories.goal > 0
                  ? ` из ${formatCalories(progress.calories.goal)}`
                  : ""
              }`
            : undefined
        }
        actions={
          <>
            <Button
              size="icon"
              variant="secondary"
              aria-label="Дневная цель"
              onClick={() => {
                setGoalKey((n) => n + 1);
                setGoalFormOpen(true);
              }}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            {/* Камеры здесь больше нет: разбор по фото стал главной кнопкой
                внутри дневника (FoodCaptureCard), а иконка в шапке была ровно
                тем местом, где самая сильная функция раздела оставалась
                незамеченной. */}
            <Button size="icon" aria-label="Добавить продукт" onClick={() => openPicker("breakfast")}>
              <Plus className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {/* The tab bar depends only on local UI state, never on the data below
          it, so it renders immediately rather than popping in once loading
          resolves — the one piece of chrome that has no reason to wait. */}
      {!isError && <NutritionTabs tab={tab} onChange={setTab} />}

      {isPending && <NutritionSkeleton />}

      {isError && (
        <EmptyState
          icon={<Salad className="h-5 w-5" />}
          title="Дневник не загрузился"
          description="Проверь соединение — записи никуда не делись."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && (
        <>
          {tab === "diary" && progress && (
            <>
              <DayNavigator day={activeDay} today={today} windowStart={windowStart} onChange={setDay} />

              <MacroSummaryCard progress={progress} />

              {/* Объяснение под цифрами, а не вместо них. Свёрнуто по
                  умолчанию: пришедший записать обед не должен пролистывать
                  абзац о белке до кнопки, а увидевший «140 из 160» впервые —
                  находит смысл этой цифры там же, где её прочитал. */}
              <MacroWhyCard progress={progress} />

              {/* Сразу под цифрами дня: сначала человек видит, где он, потом —
                  чем это изменить. Обратный порядок превратил бы экран в форму
                  ввода, открывающуюся результатом. */}
              <FoodCaptureCard
                onAnalyzed={openFormWithAnalysis}
                onManual={() => openPicker("breakfast")}
              />

              <WaterCard progress={progress.waterMl} onAdd={(delta) => addWater(activeDay, delta)} />

              {!hasData ? (
                <EmptyState
                  className="py-10"
                  icon={<Salad className="h-5 w-5" />}
                  title="День ещё не записан"
                  description="Сфотографируй тарелку — Nova посчитает калории и БЖУ сама."
                  action={
                    <Button size="lg" onClick={() => openPicker("breakfast")}>
                      Добавить вручную
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {meals.map(({ slot, entries: slotEntries }) => (
                    <MealGroupCard
                      key={slot}
                      slot={slot}
                      entries={slotEntries}
                      onAddFood={() => openPicker(slot)}
                      onDeleteEntry={deleteEntry}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "templates" && (
            <div className="flex flex-col gap-5">
              <QuickTemplatesGrid onApply={applyQuickTemplateToday} />

              <TemplatesList
                templates={templates}
                onCreate={() => {
                  setEditingTemplate(null);
                  setTemplateKey((n) => n + 1);
                  setTemplateFormOpen(true);
                }}
                onApply={(template) => void applyTemplateToday(template)}
                onDelete={deleteTemplate}
              />
            </div>
          )}

          {tab === "foods" && (
            <FoodsList
              foods={foods}
              onCreate={openCreateFood}
              onEdit={openEditFood}
              onToggleFavorite={setFoodFavorite}
            />
          )}

          {tab === "stats" && (
            <NutritionStatsCard entries={entries} water={water} goal={goal} today={today} />
          )}
        </>
      )}

      <FoodPickerModal
        key={`picker-${pickerKey}`}
        foods={foods}
        open={isPickerVisible}
        onOpenChange={(next) => {
          if (!next) {
            setPickerSlot(null);
            setIntentDismissed(true);
          }
        }}
        onSelect={selectFood}
        onCreateNew={openCreateFoodForSlot}
      />

      <LogEntryModal
        key={`log-${logKey}`}
        food={pickedFood}
        defaultSlot={effectiveSlot}
        day={activeDay}
        open={pickedFood !== null}
        onOpenChange={(next) => !next && setPickedFood(null)}
        onLog={createEntry}
        onToggleFavorite={setFoodFavorite}
      />

      <FoodFormModal
        key={`food-form-${foodFormKey}`}
        food={editingFood}
        initialName={pendingFoodName}
        initialAnalysis={photoAnalysis}
        open={isFoodFormVisible}
        onOpenChange={(next) => {
          setFoodFormOpen(next);
          if (!next) setIntentDismissed(true);
        }}
        onCreate={handleFoodCreated}
        onUpdate={updateFood}
      />

      <TemplateFormModal
        key={`template-form-${templateKey}`}
        template={editingTemplate}
        foods={foods}
        open={templateFormOpen}
        onOpenChange={setTemplateFormOpen}
        onCreate={createTemplate}
        onUpdate={updateTemplate}
      />

      <GoalFormModal
        key={`goal-form-${goalKey}`}
        goal={goal}
        body={
          profile
            ? {
                age: profile.age,
                heightCm: profile.heightCm,
                weightKg: profile.weightKg,
                gender: profile.gender,
                activity: (profile.activityLevel as ActivityLevel | null) ?? null,
              }
            : null
        }
        open={goalFormOpen}
        onOpenChange={setGoalFormOpen}
        onSave={setGoal}
      />
    </PageContainer>
  );
}
