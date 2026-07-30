import { ListTodo } from "lucide-react";
import { SectionPlaceholder } from "@/shared/ui/section-placeholder";

export default function TasksPage() {
  return (
    <SectionPlaceholder
      icon={<ListTodo className="h-6 w-6" />}
      title="Задачи"
      description="Здесь появится список задач на день с отметками выполнения. Пока создавайте их с главного экрана."
    />
  );
}
