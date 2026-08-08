import { z } from "zod";
import { CONSENT_IDS, REQUIRED_CONSENTS } from "@/features/legal/constants";

export const consentIdSchema = z.enum(CONSENT_IDS);

/**
 * Набор отметок, пришедший с экрана согласия.
 *
 * Обязательные согласия проверяются здесь, на сервере, а не только
 * заблокированной кнопкой: кнопка — это удобство, а основание обработки должно
 * существовать независимо от того, что прислал клиент. Запрос без обязательной
 * отметки отвергается схемой и не доходит до записи.
 */
export const acceptConsentsInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  granted: z
    .array(consentIdSchema)
    .max(CONSENT_IDS.length)
    .refine(
      (granted) => REQUIRED_CONSENTS.every((required) => granted.includes(required)),
      { message: "Обязательные согласия не отмечены" },
    ),
});

export const revokeConsentInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  consentId: consentIdSchema,
});
