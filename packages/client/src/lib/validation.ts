import { z } from "zod"
import type { TFunction } from "i18next"

export const requiredString = (t: TFunction) =>
  z.string().trim().min(1, { message: t("validation.required") })
