import { Target, ListTodo } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Button } from "@/shared/ui/button";
import type { ActiveItem } from "@/features/activity/types";

export function FocusOfDayCard({
  focus,
  onCreateGoal,
}: {
  focus: ActiveItem | null;
  onCreateGoal: () => void;
}) {
  if (!focus) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Фокус дня</p>
          <EmptyState
            icon={<Target className="h-5 w-5" />}
            title="Пока нет фокуса на сегодня"
            description="Добавьте цель — и Nova будет напоминать о ней здесь каждый день."
            action={
              <Button size="sm" variant="secondary" onClick={onCreateGoal}>
                Добавить цель
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="relative overflow-hidden border-accent-border"
      style={{
        background:
          "linear-gradient(135deg, var(--color-accent-muted), var(--surface-1) 60%)",
      }}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-[0_8px_20px_-8px_var(--accent)]">
          {focus.type === "goal" ? (
            <Target className="h-6 w-6" />
          ) : (
            <ListTodo className="h-6 w-6" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Фокус дня · {focus.type === "goal" ? "цель" : "задача"}
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-foreground">{focus.title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
