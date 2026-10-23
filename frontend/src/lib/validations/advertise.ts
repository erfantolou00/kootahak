import { z } from "zod";

export const AD_DESCRIPTION_MAX = 400;

function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632));
}

export const advertiseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "نام را کامل‌تر بنویسید")
    .max(60, "نام نباید بیشتر از ۶۰ کاراکتر باشد"),
  email: z.email("ایمیل معتبر نیست").trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .transform((value) => toEnglishDigits(value).replace(/[\s-]/g, ""))
    .refine(
      (value) => /^09\d{9}$/.test(value),
      "شماره را با ۰۹ و ۱۱ رقم وارد کنید",
    ),
  description: z
    .string()
    .trim()
    .min(10, "توضیح تبلیغ را کمی کامل‌تر بنویسید")
    .max(
      AD_DESCRIPTION_MAX,
      `توضیح حداکثر ${AD_DESCRIPTION_MAX} کاراکتر است`,
    ),
});

export type AdvertiseFormValues = z.input<typeof advertiseSchema>;
