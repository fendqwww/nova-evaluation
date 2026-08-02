import { Target, ListTodo, ChevronRight } from "lucide-react";
import { Card, CardContent, IconChip } from "@/shared/ui/card";
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
        <CardContent className="p-4">
          <p className="mb-2 text-label uppercase text-muted-foreground">Фокус дня</p>
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
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <IconChip tone={focus.type === "goal" ? "goal" : "task"} size="md">
          {focus.type === "goal" ? (
            <Target className="h-4 w-4" />
          ) : (
            <ListTodo className="h-4 w-4" />
          )}
        </IconChip>

        <div className="min-w-0 flex-1">
          <p className="text-label uppercase text-muted-foreground">
            Фокус дня · {focus.type === "goal" ? "цель" : "задача"}
          </p>
          <p className="mt-0.5 truncate text-title text-foreground">{focus.title}</p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
      </CardContent>
    </Card>
  );
}
