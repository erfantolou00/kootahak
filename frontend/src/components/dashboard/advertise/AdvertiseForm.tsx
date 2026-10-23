"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import { formatCount } from "@/lib/analytics/labels";
import {
  AD_DESCRIPTION_MAX,
  advertiseSchema,
  type AdvertiseFormValues,
} from "@/lib/validations/advertise";

const fieldClassName =
  "w-full rounded-token-md border border-border bg-card px-4 text-token-sm text-foreground shadow-token-sm transition-colors duration-token-normal placeholder:text-muted-foreground focus:border-brand/30 focus:outline-none";

export default function AdvertiseForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AdvertiseFormValues>({
    resolver: zodResolver(advertiseSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      description: "",
    },
  });

  const descriptionLength = watch("description")?.length ?? 0;

  return (
    <section className="mx-auto max-w-xl">
      <h2 className="text-token-xl font-token-semibold leading-relaxed text-foreground">
        برندتان را جایی بگذارید که لینک‌ها باز می‌شوند.
      </h2>
      <p className="mt-2 text-token-sm leading-relaxed text-muted-foreground">
        مشخصات را کامل کنید. تیم کوتاهک بعد از بررسی، برای هماهنگی تبلیغ با شما
        تماس می‌گیرد.
      </p>

      {submitted ? (
        <div className="mt-8 rounded-token-xl border border-border bg-background p-6">
          <p className="text-token-base font-token-semibold text-foreground">
            درخواست تبلیغ شما آماده شد.
          </p>
          <p className="mt-2 text-token-sm leading-relaxed text-muted-foreground">
            به‌زودی برای هماهنگی جزئیات تبلیغ با شما تماس می‌گیریم.
          </p>
        </div>
      ) : (
        <form
          className="mt-8 space-y-5"
          onSubmit={handleSubmit(() => setSubmitted(true))}
          noValidate
        >
          <Field
            id="advertise-name"
            label="نام"
            error={errors.name?.message}
          >
            <input
              id="advertise-name"
              type="text"
              autoComplete="name"
              placeholder="نام و نام خانوادگی"
              className={`${fieldClassName} h-12`}
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </Field>

          <Field
            id="advertise-email"
            label="ایمیل"
            error={errors.email?.message}
          >
            <input
              id="advertise-email"
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder="name@example.com"
              className={`${fieldClassName} h-12 text-left`}
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
          </Field>

          <Field
            id="advertise-phone"
            label="شماره تلفن"
            error={errors.phone?.message}
          >
            <input
              id="advertise-phone"
              type="tel"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09123456789"
              className={`${fieldClassName} h-12 text-left`}
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
          </Field>

          <Field
            id="advertise-description"
            label="توضیحات تبلیغاتی شما"
            error={errors.description?.message}
          >
            <textarea
              id="advertise-description"
              rows={5}
              maxLength={AD_DESCRIPTION_MAX}
              placeholder="مخاطب، پیام و بازه تبلیغ را کوتاه بنویسید"
              className={`${fieldClassName} resize-y py-3 leading-relaxed`}
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            <p className="text-token-xs text-muted-foreground">
              {formatCount(descriptionLength)} از {formatCount(AD_DESCRIPTION_MAX)}{" "}
              کاراکتر
            </p>
          </Field>

          <Button type="submit" fullWidth>
            ثبت درخواست تبلیغ
          </Button>
        </form>
      )}
    </section>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="label block text-foreground" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-token-xs font-token-medium text-error">{error}</p>
      ) : null}
    </div>
  );
}
