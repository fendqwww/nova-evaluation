"use client";

import { useMemo, useState } from "react";
import { Compass, RefreshCw, Route, Trophy } from "lucide-react";
import { AsyncSection } from "@/shared/ui/async-section";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import { haptics } from "@/shared/lib/haptics";
import { useAddIntent } from "@/shared/lib/use-add-intent";
import { usePath } from "@/features/path/hooks/use-path";
import { pathProgress } from "@/features/path/lib/progress";
import { PathProgressCard } from "@/features/path/components/path-progress-card";
import { PathStageList } from "@/features/path/components/path-stage-list";
import { PathWizardModal } from "@/features/path/components/path-wizard-modal";
import { PathSkeleton } from "@/features/path/components/path-skeleton";

/**
 * «Мой путь» — экран, отвечающий на вопрос «куда я иду и что делать сегодня».
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ЭКРАН, А НЕ ВКЛАДКА. Путь открывают не каждый день: его
 * создают раз в три месяца и сверяются с ним раз в неделю. Вкладка внизу — самый
 * дорогой ресурс интерфейса, и отдавать её экрану, который открывают по
 * воскресеньям, значит отнять место у питания, куда заходят трижды в день.
 * Поэтому вход сюда — с главной (карточка «Мой путь», где живёт следующий шаг) и
 * из профиля, а сам экран — полноценный, а не всплывающий лист.
 *
 * Порядок: состояние и следующий шаг сверху, этапы под ними, управление путём
 * внизу. Кнопки «перестроить» и «цель достигнута» стоят последними намеренно —
 * это редкие действия, и в верхней части экрана они соревновались бы за внимание
 * с тем единственным шагом, который нужно сделать сейчас.
 */
export function PathView() {
  const {
    snapshot,
    isPending,
    isError,
    retry,
    setStepDone,
    createPath,
    isCreating,
    finishPath,
    isFinishing,
  } = usePath();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  /**
   * Пришли по кнопке «Создать мой путь» с главной (`/path?add=1`).
   *
   * Интент выводится, а не заталкивается в состояние эффектом, и гасится
   * `intentDismissed`, чтобы закрытие визарда не открывало его снова — то же
   * правило, по которому разобраны интенты в разделе «Питание».
   */
  const addIntent = useAddIntent();
  const [intentDismissed, setIntentDismissed] = useState(false);

  const path = snapshot?.path ?? null;

  const progress = useMemo(
    () => (path ? pathProgress(path, snapshot?.currentWeightKg ?? null) : null),
    [path, snapshot?.currentWeightKg],
  );

  function openWizard() {
    haptics.tap();
    setWizardKey((n) => n + 1);
    setWizardOpen(true);
  }

  return (
    <PageContainer className="flex flex-col gap-4">
      <PageHeader
        title="Мой путь"
        subtitle={
          path
            ? `${path.horizonDays} дней · ${path.source === "model" ? "план собран AI по твоим данным" : "план по методике Nova"}`
            : "Маршрут от точки А к результату"
        }
      />

      <AsyncSection
        isPending={isPending}
        isError={isError}
        skeleton={<PathSkeleton />}
        onRetry={retry}
        icon={<Route className="h-5 w-5" />}
        errorTitle="Путь не загрузился"
      >
        {path === null || progress === null ? (
          <EmptyState
            className="py-12"
            icon={<Compass className="h-5 w-5" />}
            title="Не знаешь, с чего начать?"
            description="Выбери цель — Nova построит маршрут по твоим данным и скажет, что делать сегодня, а что через месяц."
            action={
              <Button size="lg" onClick={openWizard}>
                Создать мой путь
              </Button>
            }
          />
        ) : (
          <Reveal className="gap-4">
            <RevealItem>
              <PathProgressCard path={path} progress={progress} />
            </RevealItem>

            <RevealItem>
              <PathStageList
                stages={progress.stages}
                currentStageIndex={progress.currentStage?.index ?? 0}
                onToggle={setStepDone}
              />
            </RevealItem>

            <RevealItem className="flex flex-col gap-2 pt-1">
              <p className="text-section text-muted-foreground">Управление путём</p>

              <Card>
                <div className="flex flex-col gap-2 p-3">
                  {/* «Цель достигнута» доступна всегда, а не только на 100%:
                      человек, сбросивший свои килограммы за шесть недель вместо
                      двенадцати, не должен доказывать это приложению
                      прокликиванием оставшихся шагов. */}
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={isFinishing}
                    onClick={() => {
                      haptics.success();
                      void finishPath(path.id, "completed");
                    }}
                    className="w-full justify-start"
                  >
                    <Trophy className="h-4 w-4" />
                    Цель достигнута
                  </Button>

                  <Button
                    variant="ghost"
                    size="md"
                    disabled={isFinishing}
                    onClick={openWizard}
                    className="w-full justify-start text-muted-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Перестроить или сменить цель
                  </Button>
                </div>
              </Card>

              {(snapshot?.archivedCount ?? 0) > 0 && (
                <p className="px-1 text-[0.6875rem] text-subtle-foreground">
                  Пройденных и отложенных путей: {snapshot?.archivedCount}. Прежние планы остаются
                  в истории — они не удаляются.
                </p>
              )}
            </RevealItem>
          </Reveal>
        )}
      </AsyncSection>

      <PathWizardModal
        key={`wizard-${wizardKey}`}
        open={wizardOpen || (addIntent === "1" && !intentDismissed && !isPending)}
        onOpenChange={(next) => {
          setWizardOpen(next);
          if (!next) setIntentDismissed(true);
        }}
        currentWeightKg={snapshot?.currentWeightKg ?? null}
        replacingTitle={path?.title ?? null}
        onCreate={async (draft) => {
          await createPath(draft);
        }}
        isCreating={isCreating}
      />
    </PageContainer>
  );
}
