import { THEME_COLOR_KEY, THEME_MODE_KEY } from "@/shared/lib/theme-storage";
import { THEME_VALUES, DEFAULT_THEME } from "@/shared/config/themes";

/**
 * Тема до первого кадра.
 *
 * ПОЧЕМУ ЭТО ВООБЩЕ НУЖНО. Акцент и режим приезжали из базы вместе с сессией,
 * то есть после сетевого запроса, и всё это время приложение стояло на
 * значениях по умолчанию — тёмная тема и Nova Blue. Человек, выбравший светлую
 * и Emerald, при каждом запуске видел чужую тему, а затем её подмену. Это и
 * читалось как «переключение цветов не работает»: механизм был исправен, но
 * результат его работы всегда приходил с опозданием и на глазах у пользователя.
 *
 * Скрипт выполняется синхронно при разборе документа — до того, как браузер
 * нарисует хоть что-то из содержимого приложения, — и ставит на <html> ровно те
 * два атрибута, которые ставит applyTheme* в рантайме. Дальше SessionBoundary
 * применит серверное значение поверх: если человек сменил тему на другом
 * устройстве, кэш перезапишется на первом же ответе сессии.
 *
 * ТОЛЬКО В ПРИЛОЖЕНИИ, НЕ В КОРНЕВОЙ ВЁРСТКЕ. Лендинг и юридические страницы
 * нарисованы тёмными по замыслу и содержат литеральные white/black-утилиты,
 * которые светлый режим не переопределяет. Пустить туда режим пользователя
 * значило бы сломать публичные страницы ради настройки, которая к ним не
 * относится.
 *
 * ЧТО ЗДЕСЬ ЗАПРЕЩЕНО. Обращаться к чему-либо, кроме localStorage и
 * documentElement, и падать. Скрипт стоит на пути к первому кадру: исключение в
 * нём — белый экран вместо приложения, поэтому тело целиком в try/catch, а
 * прочитанные значения проверяются по спискам, а не подставляются как есть
 * (в localStorage лежит то, что туда положили, включая мусор из старой версии).
 */

// Инлайнится в разметку, поэтому собирается из тех же констант, что и рантайм:
// список тем, попавший сюда копипастой, разошёлся бы с globals.css на первой же
// добавленной палитре.
const SCRIPT = `
(function(){
  try {
    var root = document.documentElement;
    var themes = ${JSON.stringify(THEME_VALUES)};
    var color = localStorage.getItem(${JSON.stringify(THEME_COLOR_KEY)});
    root.dataset.theme = themes.indexOf(color) === -1 ? ${JSON.stringify(DEFAULT_THEME)} : color;

    var mode = localStorage.getItem(${JSON.stringify(THEME_MODE_KEY)});
    if (mode !== "light" && mode !== "dark") {
      mode = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }
    root.dataset.mode = mode;
    root.style.colorScheme = mode;
  } catch (error) {
    // Хранилище недоступно (WebView без cookies) или DOM ещё не тот, что мы
    // ожидали. Тема останется дефолтной — это ровно то поведение, которое было
    // до появления кэша, и оно не мешает приложению запуститься.
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} suppressHydrationWarning />;
}
