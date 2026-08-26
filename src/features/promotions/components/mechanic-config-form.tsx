"use client"

import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form"

import type { BenefitType } from "@/types/domain"

import type { CouponBatchOption, ProductOption } from "../lib/queries"
import type { PromotionValues } from "../schemas"
import { BxgyForm } from "./mechanic-forms/bxgy-form"
import { CashbackForm } from "./mechanic-forms/cashback-form"
import { ContinuityForm } from "./mechanic-forms/continuity-form"
import { FixedBundleForm } from "./mechanic-forms/fixed-bundle-form"
import { FreeProductForm } from "./mechanic-forms/free-product-form"
import { FreeShippingForm } from "./mechanic-forms/free-shipping-form"
import { IssueCouponForm } from "./mechanic-forms/issue-coupon-form"
import { PointsBonusForm } from "./mechanic-forms/points-bonus-form"
import { PointsMultiplierForm } from "./mechanic-forms/points-multiplier-form"
import { SpecialPriceForm } from "./mechanic-forms/special-price-form"

type MechanicConfigFormProps = {
  benefitType: BenefitType
  control: Control<PromotionValues>
  register: UseFormRegister<PromotionValues>
  errors: FieldErrors<PromotionValues>
  setValue: UseFormSetValue<PromotionValues>
  products: ProductOption[]
  couponBatches: CouponBatchOption[]
  /** Solo lo usa `descuento_continuidad` — salta al paso "Condiciones", donde se define a qué productos/marcas aplica la promoción. */
  onGoToConditionsStep: () => void
}

/**
 * Despacha al formulario dedicado de cada mecánica "nueva"/"mejorada" —
 * las 3 mecánicas de descuento variable (`descuento_porcentual`,
 * `descuento_monto_fijo`, `descuento_escalonado`) NO pasan por aquí: siguen
 * siendo los campos inline de `promotion-form.tsx` (Valor/Tope máximo/
 * Aplicar sobre + `DiscountTiersBuilder` para escalonado).
 */
export function MechanicConfigForm({
  benefitType,
  control,
  register,
  errors,
  setValue,
  products,
  couponBatches,
  onGoToConditionsStep,
}: MechanicConfigFormProps) {
  switch (benefitType) {
    case "envio_gratis":
      return (
        <FreeShippingForm
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
        />
      )
    case "producto_gratis":
      return (
        <FreeProductForm
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
          products={products}
        />
      )
    case "precio_fijo_bundle":
      return (
        <FixedBundleForm
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
          products={products}
        />
      )
    case "por_piezas":
      return (
        <BxgyForm
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
          products={products}
        />
      )
    case "multiplicador_puntos":
      return (
        <PointsMultiplierForm
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
        />
      )
    case "bono_puntos":
      return (
        <PointsBonusForm
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
        />
      )
    case "emitir_cupon":
      return (
        <IssueCouponForm
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
          couponBatches={couponBatches}
        />
      )
    case "precio_especial":
      return (
        <SpecialPriceForm
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
          products={products}
        />
      )
    case "cashback":
      return (
        <CashbackForm
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
        />
      )
    case "descuento_continuidad":
      return (
        <ContinuityForm
          control={control}
          register={register}
          errors={errors}
          setValue={setValue}
          onGoToConditionsStep={onGoToConditionsStep}
        />
      )
    default:
      return null
  }
}
