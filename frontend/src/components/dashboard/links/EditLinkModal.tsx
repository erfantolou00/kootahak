"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import GetIcon from "@/components/ui/Icon";

import Button from "@/components/ui/Button";
import JalaliDateTimePicker from "@/components/ui/JalaliDateTimePicker";
import { toDatetimeLocalValue } from "@/lib/links/datetime";
import { shortLinkOrigin } from "@/lib/links/short-url";
import {
  updateLinkSchema,
  type UpdateLinkFormValues,
} from "@/lib/validations/link";
import type { Link } from "@/types/links";

const inputClassName =
  "h-12 w-full rounded-token-md border border-border bg-card px-4 text-token-sm text-foreground shadow-token-sm transition-colors duration-token-normal placeholder:text-muted-foreground focus:border-brand/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

interface EditLinkModalProps {
  open: boolean;
  link: Link | null;
  onClose: () => void;
  onSubmit: (data: UpdateLinkFormValues) => void;
  /** از والد میاد — تا وقتی mutation در جریانه، دکمه‌ها disabled بمونن */
  isSubmitting?: boolean;
}

export default function EditLinkModal({
  open,
  link,
  onClose,
  onSubmit,
  isSubmitting = false,
}: EditLinkModalProps) {
  "use no memo";
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateLinkFormValues>({
    resolver: zodResolver(updateLinkSchema),
    defaultValues: {
      originalUrl: "",
      title: "",
      shortCode: "",
      expiresAt: "",
    },
  });

  // هر وقت مودال باز شد یا لینک عوض شد، فرم رو با مقادیر لینک پر کن
  useEffect(() => {
    if (!open || !link) return;

    reset({
      originalUrl: link.originalUrl,
      title: link.title,
      shortCode: link.shortCode,
      expiresAt: toDatetimeLocalValue(link.expiresAt),
    });
  }, [open, link, reset]);

  // بستن با Escape
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, isSubmitting]);

  const handleFormSubmit = (data: UpdateLinkFormValues) => {
    onSubmit(data);
  };

  if (!open || !link) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="surface max-h-[92dvh] w-full overflow-visible rounded-t-token-xl p-5 shadow-token-md sm:max-w-2xl sm:rounded-token-xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-link-title"
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-token-lg bg-brand/10 text-brand">
              <GetIcon name="Pencil" className="size-5" />
            </div>
            <div>
              <h2 id="edit-link-title" className="h3">
                ویرایش لینک
              </h2>
              <p className="mt-1 text-token-sm text-muted-foreground">
                اطلاعات لینک را ویرایش کنید
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex size-11 shrink-0 items-center justify-center rounded-token-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            aria-label="بستن"
          >
            <GetIcon name="X" className="size-5" />
          </button>
        </div>

        <dl className="mb-5 grid grid-cols-2 gap-3 rounded-token-lg bg-muted/50 p-4 text-token-sm sm:grid-cols-4">
          <div>
            <dt className="text-token-xs text-muted-foreground">شناسه</dt>
            <dd className="mt-1 font-token-medium">{link.id}</dd>
          </div>
          <div>
            <dt className="text-token-xs text-muted-foreground">وضعیت</dt>
            <dd className="mt-1 font-token-medium">
              {link.isActive ? "فعال" : "غیرفعال"}
            </dd>
          </div>
          <div>
            <dt className="text-token-xs text-muted-foreground">تاریخ ایجاد</dt>
            <dd className="mt-1 font-token-medium">
              {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(
                new Date(link.createdAt),
              )}
            </dd>
          </div>
          <div>
            <dt className="text-token-xs text-muted-foreground">پین</dt>
            <dd className="mt-1 font-token-medium">
              {link.isPin ? "پین شده" : "عادی"}
            </dd>
          </div>
        </dl>

        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit(handleFormSubmit)}
          noValidate
        >
          <div className="space-y-2 sm:col-span-2">
            <label
              className="label block text-foreground"
              htmlFor="edit-originalUrl"
            >
              آدرس اصلی
            </label>
            <input
              id="edit-originalUrl"
              type="url"
              dir="ltr"
              placeholder="https://example.com/page"
              autoComplete="url"
              disabled={isSubmitting}
              className={inputClassName}
              aria-invalid={Boolean(errors.originalUrl)}
              {...register("originalUrl")}
            />
            {errors.originalUrl && (
              <p className="text-token-xs font-token-medium text-error">
                {errors.originalUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="label block text-foreground" htmlFor="edit-title">
              عنوان
            </label>
            <input
              id="edit-title"
              type="text"
              placeholder="مثلاً لندینگ محصول"
              disabled={isSubmitting}
              className={inputClassName}
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-token-xs font-token-medium text-error">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              className="label block text-foreground"
              htmlFor="edit-shortCode"
            >
              کد کوتاه
            </label>
            <div className="flex items-center">
              <input
                id="edit-shortCode"
                type="text"
                dir="ltr"
                placeholder="xc2z9"
                disabled={isSubmitting}
                className="h-12 w-full rounded-token-md rounded-l-none border border-border bg-card px-4 text-token-sm text-foreground shadow-token-sm transition-colors duration-token-normal placeholder:text-muted-foreground focus:border-brand/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                aria-invalid={Boolean(errors.shortCode)}
                {...register("shortCode")}
              />
              <span
                className="grid h-12 shrink-0 place-items-center rounded-token-md rounded-r-none bg-background px-4 text-token-sm text-muted-foreground"
                dir="ltr"
              >
                {shortLinkOrigin()}/
              </span>
            </div>
            {errors.shortCode && (
              <p className="text-token-xs font-token-medium text-error">
                {errors.shortCode.message}
              </p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label
              className="label block text-foreground"
              htmlFor="edit-expiresAt"
            >
              تاریخ انقضا{" "}
              <span className="text-muted-foreground">(اختیاری)</span>
            </label>
            <Controller
              name="expiresAt"
              control={control}
              render={({ field }) => (
                <JalaliDateTimePicker
                  id="edit-expiresAt"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  invalid={Boolean(errors.expiresAt)}
                />
              )}
            />
            {link.expiresAt && (
              <p className="text-token-xs text-muted-foreground">
                خالی کردن این فیلد تاریخ انقضای فعلی را حذف نمی‌کند.
              </p>
            )}
            {errors.expiresAt && (
              <p className="text-token-xs font-token-medium text-error">
                {errors.expiresAt.message}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
            >
              انصراف
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              ذخیره تغییرات
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
