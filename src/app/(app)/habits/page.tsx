import { Repeat } from "lucide-react";
import { SectionPlaceholder } from "@/shared/ui/section-placeholder";

export default function HabitsPage() {
  return (
    <SectionPlaceholder
      icon={<Repeat className="h-6 w-6" />}
      title="Привычки"
      description="Здесь появятся серии выполнения и отметки по дням. Пока создавайте привычки с главного экрана."
    />
  );
}
