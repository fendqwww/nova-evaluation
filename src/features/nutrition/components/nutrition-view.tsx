"use client";

import { useState } from "react";
import { Settings2, Plus, Salad } from "lucide-react";
import { HealthSectionTabs } from "@/components/health-section-tabs";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { useNutrition } from "@/features/nutrition/hooks/use-nutrition";
import { NutritionSkeleton } from "@/features/nutrition/components/nutrition-skeleton";
import { NutritionTabs, type NutritionTabId } from "@/features/nutrition/components/nutrition-tabs";
import { DayNavigator } from "@/features/nutrition/components/day-navigator";
import { MacroSummaryCard } from "@/features/nutrition/components/macro-summary-card";
import { WaterCard } from "@/features/nutrition/components/water-card";
import { MealGroupCard } from "@/features/nutrition/components/meal-group-card";
import { FoodPickerModal } from "@/features/nutrition/components/food-picker-modal";
import { FoodFormModal } from "@/features/nutrition/components/food-form-modal";
import { LogEntryModal } from "@/features/nutrition/components/log-entry-modal";
import { FoodsList } from "@/features/nutrition/components/foods-list";
import { TemplatesList } from "@/features/nutrition/components/templates-list";
import { TemplateFormModal } from "@/features/nutrition/components/template-form-modal";
import { GoalFormModal } from "@/features/nutrition/components/goal-form-modal";
import { NutritionStatsCard } from "@/features/nutrition/components/nutrition-stats-card";
import { dayProgress, entriesOnDay, groupByMeal } from "@/features/nutrition/lib/stats";
import { formatCalories } from "@/features/nutrition/lib/format";
import type { MealSlot, NutritionFoodItem, NutritionMealTemplate } from "@/features/nutrition/types";

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
  } = useNutrition();

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
    setLogAfterCreate(false);
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

  return (
    <PageContainer className="flex flex-col gap-4">
      <HealthSectionTabs active="nutrition" />

      <header className="flex animate-[rise-in_var(--duration-slow)_var(--ease-enter)_both] items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">
            Питание
          </h1>
          {progress && progress.calories.value > 0 && (
            <p className="text-caption text-muted-foreground">
              {formatCalories(progress.calories.value)}
              {progress.calories.goal > 0 && ` из ${formatCalories(progress.calories.goal)}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
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
          <Button size="icon" aria-label="Добавить продукт" onClick={() => openPicker("breakfast")}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* The tab bar depends only on local UI state, never on the data below
          it, so it renders immediately rather than popping in once loading
          resolves — the one piece of chrome that has no reason to wait. */}
      {!isError && <NutritionTabs tab={tab} onChange={setTab} />}

      {isPending && <NutritionSkeleton />}

      {isError && (
        <EmptyState
          icon={<Salad className="h-5 w-5" />}
          title="Не удалось загрузить дневник питания"
          description="Проверьте соединение и попробуйте снова."
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
              <WaterCard progress={progress.waterMl} onAdd={(delta) => addWater(activeDay, delta)} />

              {!hasData ? (
                <EmptyState
                  className="py-10"
                  icon={<Salad className="h-5 w-5" />}
                  title="Дневник пока пуст"
                  description="Добавьте первый продукт — калории и БЖУ посчитаются автоматически."
                  action={
                    <Button size="lg" onClick={() => openPicker("breakfast")}>
                      Добавить продукт
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
        open={pickerSlot !== null}
        onOpenChange={(next) => !next && setPickerSlot(null)}
        onSelect={selectFood}
        onCreateNew={openCreateFoodForSlot}
      />

      <LogEntryModal
        key={`log-${logKey}`}
        food={pickedFood}
        defaultSlot={targetSlot}
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
        open={foodFormOpen}
        onOpenChange={setFoodFormOpen}
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
        open={goalFormOpen}
        onOpenChange={setGoalFormOpen}
        onSave={setGoal}
      />
    </PageContainer>
  );
}
