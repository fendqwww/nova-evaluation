import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import type { BotUserState } from "../server/user-state.repository";

/**
 * Что бот говорит.
 *
 * Главное правило здесь: каждое сообщение опирается на данные этого человека.
 * «Не забудьте записать питание» — это рассылка, её выключают. «Вчера вы спали
 * 6 ч 40 мин, на час меньше обычного» — это про него, и такое читают.
 *
 * Отсюда же следует, чего здесь нет: восклицательных знаков, «Привет! 👋»,
 * мотивационных лозунгов и слова «важно». Nova разговаривает как приложение
 * для взрослых людей, а не как рассылка фитнес-клуба, и тон сообщений в
 * Telegram обязан совпадать с тоном интерфейса — иначе бот выглядит подделкой
 * под приложение, которым человек пользуется.
 *
 * Второе правило: сообщение всегда заканчивается одним конкретным действием, а
 * не приглашением «загляните в приложение». Кнопка под сообщением открывает
 * ровно тот экран, о котором шла речь.
 */

export interface BotMessage {
  text: string;
  /** Куда ведёт кнопка: путь внутри Mini App. */
  deepLink: string;
  buttonText: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* -------------------------------------------------------------- утро --- */

/**
 * Утренний бриф.
 *
 * Строится от того, что у человека уже есть, а не от того, чего не хватает:
 * первое — наблюдение, второе — упрёк в восемь утра.
 *
 * Порядок веток — это приоритет: сон вчерашней ночи важнее серии привычек,
 * потому что он объясняет, каким будет сегодняшний день, а серия — это про
 * прошлое.
 */
export function morningMessage(state: BotUserState): BotMessage {
  const name = escapeHtml(state.firstName);

  if (state.sleepHoursLastNight !== null) {
    const hours = state.sleepHoursLastNight;
    const verdict =
      hours < 6
        ? "Это мало — сегодня стоит рассчитывать на меньшую нагрузку."
        : hours > 8.5
          ? "Хорошо выспались."
          : "Нормальная ночь.";

    return {
      text: [
        `Доброе утро, ${name}.`,
        "",
        `Прошлой ночью — <b>${formatHours(hours)}</b> сна. ${verdict}`,
        "",
        state.habitsDueToday > 0
          ? `Сегодня по расписанию ${state.habitsDueToday} ${pluralizeRu(state.habitsDueToday, ["привычка", "привычки", "привычек"])}.`
          : "На сегодня привычек по расписанию нет.",
      ].join("\n"),
      deepLink: "/",
      buttonText: "Открыть день",
    };
  }

  if (state.bestStreak >= 3) {
    return {
      text: [
        `Доброе утро, ${name}.`,
        "",
        `Ваша серия — <b>${state.bestStreak} ${pluralizeRu(state.bestStreak, ["день", "дня", "дней"])}</b> подряд. Сегодня есть шанс её продлить.`,
        "",
        state.habitsDueToday > 0
          ? `По расписанию — ${state.habitsDueToday} ${pluralizeRu(state.habitsDueToday, ["привычка", "привычки", "привычек"])}.`
          : "Привычек на сегодня нет — день свободный.",
      ].join("\n"),
      deepLink: "/habits",
      buttonText: "Отметить привычки",
    };
  }

  return {
    text: [
      `Доброе утро, ${name}.`,
      "",
      state.habitsDueToday > 0
        ? `Сегодня по расписанию ${state.habitsDueToday} ${pluralizeRu(state.habitsDueToday, ["привычка", "привычки", "привычек"])}. Отметить можно в одно касание.`
        : "Как спалось? Запишите ночь — Nova свяжет сон с тем, как пройдёт день.",
    ].join("\n"),
    deepLink: state.habitsDueToday > 0 ? "/habits" : "/sleep",
    buttonText: state.habitsDueToday > 0 ? "Отметить привычки" : "Записать сон",
  };
}

/* ------------------------------------------------------------- вечер --- */

/**
 * Вечернее напоминание.
 *
 * Отправляется только когда есть незакрытое (см. decideEvening), поэтому здесь
 * не бывает ветки «всё хорошо». Одно самое весомое дело, а не список из трёх:
 * перечень задач вечером закрывают целиком, то есть не делают ничего.
 */
export function eveningMessage(state: BotUserState): BotMessage {
  const remaining = state.habitsDueToday - state.habitsDoneToday;

  if (state.notifyHabits && remaining > 0) {
    const streakNote =
      state.bestStreak >= 3
        ? ` Серия в ${state.bestStreak} ${pluralizeRu(state.bestStreak, ["день", "дня", "дней"])} прервётся.`
        : "";

    return {
      text: [
        `Осталось ${remaining} ${pluralizeRu(remaining, ["привычка", "привычки", "привычек"])} на сегодня.${streakNote}`,
        "",
        "Отметить — полминуты.",
      ].join("\n"),
      deepLink: "/habits",
      buttonText: "Отметить",
    };
  }

  if (state.notifyNutrition && !state.loggedNutritionToday) {
    return {
      text: [
        "Дневник питания сегодня пуст.",
        "",
        "Можно не расписывать всё — достаточно сфотографировать тарелку, Nova разберёт состав сама.",
      ].join("\n"),
      deepLink: "/nutrition",
      buttonText: "Добавить приём пищи",
    };
  }

  const overdue = state.tasksOverdue;
  return {
    text: [
      `${overdue} ${pluralizeRu(overdue, ["задача", "задачи", "задач"])} с прошедшим сроком.`,
      "",
      "Их стоит либо закрыть, либо перенести — просроченные задачи тянут индекс вниз.",
    ].join("\n"),
    deepLink: "/tasks",
    buttonText: "Открыть задачи",
  };
}

/* ------------------------------------------------------------ возврат --- */

/**
 * Возвратное сообщение.
 *
 * Тон здесь решает всё. Человек не пришёл — он это знает, и напоминать ему об
 * этом ещё раз бессмысленно. Поэтому сообщение говорит не «вас не было», а
 * «вот что вас ждёт»: сохранённая серия, накопленные данные, конкретная
 * цифра, которая принадлежит ему.
 *
 * Три разных текста по длительности отсутствия, потому что «не заходил три
 * дня» и «не заходил три месяца» — это разные люди, и одинаковое сообщение
 * второму читается как автоматическая рассылка, которой оно и является.
 */
export function winbackMessage(state: BotUserState): BotMessage {
  const name = escapeHtml(state.firstName);
  const days = state.daysSinceLastSeen ?? 0;

  if (days <= 7) {
    const streakNote =
      state.bestStreak > 0
        ? `Ваша серия в ${state.bestStreak} ${pluralizeRu(state.bestStreak, ["день", "дня", "дней"])} ещё жива.`
        : "Всё, что вы записали, на месте.";

    return {
      text: [
        `${name}, вас не было ${days} ${pluralizeRu(days, ["день", "дня", "дней"])}.`,
        "",
        `${streakNote} Один отмеченный день — и всё продолжится с того же места.`,
      ].join("\n"),
      deepLink: "/",
      buttonText: "Вернуться",
    };
  }

  if (days <= 30) {
    return {
      text: [
        `${name}, прошло ${days} ${pluralizeRu(days, ["день", "дня", "дней"])}.`,
        "",
        "Nova сохранила всё: тренировки, сон, питание, цели. Можно не начинать заново — можно просто продолжить.",
        "",
        "Если сейчас не до этого — так тоже бывает, приложение подождёт.",
      ].join("\n"),
      deepLink: "/reports",
      buttonText: "Посмотреть, что накопилось",
    };
  }

  return {
    text: [
      `${name}, давно не виделись.`,
      "",
      "Ваши данные никуда не делись и ждут вас. За это время в Nova появились разбор еды по фото, анализ внешности и коуч, который видит связи между сном, питанием и тренировками.",
    ].join("\n"),
    deepLink: "/",
    buttonText: "Открыть Nova",
  };
}

/* ------------------------------------------------------------ команды --- */

export function startMessage(name: string, isReturning: boolean): BotMessage {
  return {
    text: isReturning
      ? [
          `С возвращением, ${escapeHtml(name)}.`,
          "",
          "Всё на месте. Открывайте — продолжим с того, где остановились.",
        ].join("\n")
      : [
          `${escapeHtml(name)}, это Nova.`,
          "",
          "Приложение, которое собирает сон, питание, тренировки и привычки в одну картину и показывает, как они связаны между собой.",
          "",
          "Здесь, в чате, я буду присылать короткие сводки — утром о том, каким получается день, и вечером, если что-то осталось незакрытым. Отключить можно командой /stop.",
        ].join("\n"),
    deepLink: "/",
    buttonText: isReturning ? "Открыть Nova" : "Начать",
  };
}

export function todayMessage(state: BotUserState): BotMessage {
  const lines: string[] = [`<b>Сегодня</b>`, ""];

  if (state.habitsDueToday > 0) {
    lines.push(
      `Привычки: ${state.habitsDoneToday} из ${state.habitsDueToday}${
        state.habitsDoneToday === state.habitsDueToday ? " — всё закрыто" : ""
      }`,
    );
  } else {
    lines.push("Привычки: на сегодня ничего по расписанию");
  }

  lines.push(`Питание: ${state.loggedNutritionToday ? "записано" : "дневник пуст"}`);
  lines.push(
    `Сон: ${
      state.sleepHoursLastNight !== null
        ? formatHours(state.sleepHoursLastNight)
        : "не записан"
    }`,
  );

  if (state.tasksOverdue > 0) {
    lines.push(
      `Просрочено задач: ${state.tasksOverdue}`,
    );
  }

  return { text: lines.join("\n"), deepLink: "/", buttonText: "Открыть Nova" };
}

export function streakMessage(state: BotUserState): BotMessage {
  if (state.bestStreak === 0) {
    return {
      text: [
        "Серий пока нет.",
        "",
        "Серия начинается с первого отмеченного дня и растёт, пока привычка выполняется по расписанию.",
      ].join("\n"),
      deepLink: "/habits",
      buttonText: "Отметить привычку",
    };
  }

  return {
    text: [
      `Лучшая серия: <b>${state.bestStreak} ${pluralizeRu(state.bestStreak, ["день", "дня", "дней"])}</b> подряд.`,
      "",
      state.habitsDueToday > state.habitsDoneToday
        ? "Сегодня она ещё не отмечена."
        : "Сегодня уже отмечено.",
    ].join("\n"),
    deepLink: "/habits",
    buttonText: "Открыть привычки",
  };
}

export const HELP_MESSAGE = [
  "<b>Nova</b> — система, которая связывает сон, питание, тренировки и привычки в одну картину.",
  "",
  "<b>Команды</b>",
  "/start — открыть приложение",
  "/today — что у меня сегодня",
  "/streak — серии и прогресс",
  "/stop — не присылать напоминания",
  "",
  "Всё остальное живёт в самом приложении — кнопка меню слева от поля ввода.",
  "",
  "Вопрос или что-то сломалось — напишите в поддержку, она отвечает в отдельном боте.",
].join("\n");

export const STOP_MESSAGE = [
  "Больше не пишу.",
  "",
  "Приложение работает как прежде — открыть можно в любой момент кнопкой меню. Вернуть напоминания: /start.",
].join("\n");

export const RESUBSCRIBED_MESSAGE = "Напоминания снова включены.";

export const UNKNOWN_COMMAND_MESSAGE = [
  "Такой команды нет. Что я умею — /help.",
].join("\n");

/** "6.7" → "6 ч 42 мин" */
function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole} ${pluralizeRu(whole, ["час", "часа", "часов"])}`;
  return `${whole} ч ${minutes} мин`;
}
