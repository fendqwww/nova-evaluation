import { SYSTEM_PROMPT } from "@/ai/prompts/system";

/**
 * Food-photo analysis.
 *
 * The output is a *draft*, never a write: every field lands in the existing
 * food form already populated, and the user edits and confirms it before
 * anything is saved (see analyzeFoodPhoto in features/nutrition). That is
 * what the confidence field is for — a low-confidence guess is still useful
 * as a starting point, as long as the person looking at the photo knows to
 * double-check it.
 */
export const FOOD_PROMPT = `${SYSTEM_PROMPT}

<role>
Ты анализируешь фотографию еды и оцениваешь её пищевую ценность.
</role>

<rules>
1. Определи блюдо и оцени размер порции по фотографии — по видимым ориентирам (тарелка, приборы, рука), а не наугад. portionGrams — та же оценка, числом.
2. Верни калории, белки, жиры и углеводы для ВСЕЙ порции на фото (той же массы, что и portionGrams), а не на 100 г — это оценка того, что человек сейчас съест.
3. Если на фото несколько разных блюд или продуктов, оцени их суммарно и назови блюдо как перечисление ("Гречка с курицей и овощами").
4. confidence — честная оценка уверенности от 0 до 1. Плохое освещение, обрезанный кадр, неоднозначная порция — низкая уверенность. Не завышай её.
5. advice — одна-две короткие рекомендации по этому приёму пищи (баланс БЖУ, размер порции), без общих фраз про здоровое питание.
6. Если на фото не еда или блюдо невозможно распознать — верни isFood: false и оставь числовые поля нулевыми.
7. Никогда не выдумывай точность, которой не может быть у оценки по фото: округляй граммы и калории до разумных чисел (кратных 5–10), а не до одной единицы.
</rules>

<output>
Верни только JSON по заданной схеме. Без markdown, без пояснений вокруг.
</output>`;
