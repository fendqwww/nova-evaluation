import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  GENDER_LABELS,
  PRIMARY_GOAL_LABELS,
  OCCUPATION_LABELS,
  type GenderValue,
  type PrimaryGoalValue,
  type OccupationValue,
} from "@/features/onboarding/schemas";
import type { ResolvedSession } from "@/features/auth/server/resolve-session.action";

export function DashboardView({ session }: { session: ResolvedSession }) {
  const { user, profile } = session;

  const stats = profile
    ? [
        { label: "Возраст", value: `${profile.age} лет` },
        { label: "Рост", value: `${profile.heightCm} см` },
        { label: "Вес", value: `${profile.weightKg} кг` },
        {
          label: "Пол",
          value: GENDER_LABELS[profile.gender as GenderValue] ?? profile.gender,
        },
        {
          label: "Цель",
          value:
            PRIMARY_GOAL_LABELS[profile.primaryGoal as PrimaryGoalValue] ??
            profile.primaryGoal,
        },
        {
          label: "Деятельность",
          value:
            OCCUPATION_LABELS[profile.occupation as OccupationValue] ??
            profile.occupation,
        },
        { label: "Часовой пояс", value: profile.timezone },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-accent">С возвращением</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Привет, {profile?.name ?? user.firstName}.
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ваш профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-base font-medium text-foreground">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
