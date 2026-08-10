import type { ReactNode } from "react";
import { Home, Dumbbell, User, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TelegramProvider } from "@/components/providers/telegram-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ConsentGate } from "@/features/legal/components/consent-gate";
import { DeepLinkRouter } from "@/features/bot/components/deep-link-router";
import type { BottomNavigationItem } from "@/shared/ui/bottom-navigation";

// Active state is derived from the route inside BottomNavigation, so this
// stays a plain declaration of the app's tabs.
//
// ЧЕТЫРЕ ВКЛАДКИ И КНОПКА ПОСЕРЕДИНЕ.
//
// Раскладка пришла к этому в два шага. Сначала были Сегодня · Здоровье · Коуч ·
// План · Профиль — пять слотов, но три из них вели в группы, а не в экраны, и
// платило за это «Питание», самый частый раздел в приложении, сидевший за
// вкладкой «Здоровье» вместе с тремя другими экранами.
//
// Теперь ушла и вкладка «Коуч», и это единственное удаление в раскладке. Причина
// не в том, что коуч стал менее важен, а в том, что он перестал быть местом,
// куда надо ходить: его вывод — заголовок, причина и кнопка действия — стоит
// прямо на главном экране (CoachPreviewCard), а диалог открывается оттуда же и с
// экрана коуча кнопкой «Поговорить с коучем». Отдельная вкладка вела в чат,
// который сначала надо было придумать, о чём спросить. Ни один маршрут не
// исчез: /coach открывается с главной, из профиля и по прежним ссылкам из бота.
//
// Освободившийся слот отдан не новой вкладке, а симметрии: с четырьмя вкладками
// кнопка записи встаёт ровно в середину (2 + кнопка + 2), то есть в единственную
// точку, до которой большой палец достаёт, не перехватывая телефон.
//
// Что открывается не вкладкой:
//   Сон и Внешность — через HealthSectionTabs, полоску на всех четырёх экранах
//     здоровья, и через кольца состояния на главной.
//   Путь, Библиотека, Академия, Цели, Привычки, Задачи, Отчёты, Настройки —
//     через Профиль. alsoActiveFor держит вкладку подсвеченной на всех из них.
//
// The centre slot is not a tab at all — see BottomNavigation's onRecord. It
// opens the record sheet, which is what actually fixes the four-tap meal.
const navItems: BottomNavigationItem[] = [
  { key: "home", label: "Сегодня", href: "/", icon: <Home className="h-4.5 w-4.5" /> },
  {
    key: "nutrition",
    label: "Питание",
    href: "/nutrition",
    icon: <UtensilsCrossed className="h-4.5 w-4.5" />,
  },
  {
    key: "workouts",
    label: "Тренировки",
    href: "/workouts",
    alsoActiveFor: ["/sleep"],
    icon: <Dumbbell className="h-4.5 w-4.5" />,
  },
  {
    key: "profile",
    label: "Профиль",
    href: "/profile",
    alsoActiveFor: [
      "/path",
      "/library",
      "/academy",
      "/coach",
      "/settings",
      "/reports",
      "/appearance",
      "/goals",
      "/habits",
      "/tasks",
    ],
    icon: <User className="h-4.5 w-4.5" />,
  },
];

// The Telegram session boots here rather than in the root layout, so the
// public marketing pages never pay for (or wait on) the Mini App SDK.
//
// ConsentGate стоит внутри AppShell и снаружи всех экранов: обязательное
// согласие — условие доступа ко всему приложению, а не к отдельной странице, и
// проверка на каждом экране по отдельности означала бы один забытый экран.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TelegramProvider>
        <AppShell navItems={navItems}>
          {/* Приземление по ссылке из бота — внутри гейта согласий: человек,
              который ещё не подтвердил документы, должен увидеть их, а не
              раздел, на который вела кнопка. */}
          <ConsentGate>
            <DeepLinkRouter />
            {children}
          </ConsentGate>
        </AppShell>
      </TelegramProvider>
    </QueryProvider>
  );
}
