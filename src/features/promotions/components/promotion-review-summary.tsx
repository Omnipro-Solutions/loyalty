import { formatUSD, formatDate } from "@/lib/format"

import {
  ACCRUAL_TIMING_LABEL,
  APPLICATION_LEVEL_LABEL,
  APPLY_TO_LABEL,
  BALANCE_INITIAL_STATE_LABEL,
  BALANCE_TYPE_LABEL,
  BXGY_SCOPE_LABEL,
  CHANNEL_SCOPE_LABEL,
  CONDITION_FIELD_LABEL,
  CONTINUITY_BREAK_BEHAVIOR_LABEL,
  COST_NATURE_LABEL,
  BENEFIT_TYPE_LABEL,
  DAY_OF_WEEK_LABEL,
  DISCOUNT_TIER_CALCULATION_MODE_LABEL,
  DISCOUNT_TIER_THRESHOLD_LABEL,
  ENROLLMENT_REQUIREMENT_LABEL,
  FINANCIADOR_LABEL,
  MULTIPLIER_RESOLUTION_MODE_LABEL,
  NON_TRANSACTIONAL_BENEFIT_TYPE_LABEL,
  PIECE_SELECTION_CRITERION_LABEL,
  POINTS_DEBIT_TIMING_LABEL,
  PRICE_BASIS_LABEL,
  PROMOTION_TYPE_LABEL,
  RETURN_EFFECT_LABEL,
  RX_APPLICABILITY_LABEL,
  SETTLEMENT_PERIOD_LABEL,
  STACKING_MODE_LABEL,
  STORE_FORMAT_LABEL,
  TIER_NAME_LABEL,
  TRIGGER_EVENT_LABEL,
  formatContinuityTier,
  formatDiscountTier,
  formatLimitRow,
} from "../lib/labels"
import { isConditionGroup } from "../lib/condition-tree"
import { BENEFIT_TYPES_WITH_APPLY_TO } from "../lib/mechanic-fields"
import type {
  ConditionCategory,
  ConditionSegment,
  ConditionTier,
  CouponBatchOption,
  ProductOption,
  SupplierOption,
} from "../lib/queries"
import type {
  ConditionNodeValues,
  ConditionValues,
  PromotionValues,
} from "../schemas"

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-secondary-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function SummaryGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function conditionLeafSummary(
  condition: ConditionValues,
  categoryNameById: Map<string, string>,
  segmentNameById: Map<string, string>,
  couponBatchNameById: Map<string, string>,
  tierNameById: Map<string, string>,
  productNameById: Map<string, string>
): string {
  if (condition.campo === "categoria") {
    return (
      condition.valor.map((id) => categoryNameById.get(id) ?? id).join(", ") ||
      "—"
    )
  }
  if (condition.campo === "producto") {
    return (
      condition.valor.map((id) => productNameById.get(id) ?? id).join(", ") ||
      "—"
    )
  }
  if (condition.campo === "segmento") {
    return segmentNameById.get(condition.valor) ?? condition.valor
  }
  if (condition.campo === "monto_carrito") {
    return formatUSD(condition.valor)
  }
  if (condition.campo === "cupon_codigo") {
    return couponBatchNameById.get(condition.valor) ?? condition.valor
  }
  if (condition.campo === "socio_nivel") {
    return (
      condition.valor.map((id) => tierNameById.get(id) ?? id).join(", ") || "—"
    )
  }
  if (condition.campo === "tienda_formato") {
    return (
      condition.valor
        .map((f) => STORE_FORMAT_LABEL[f as keyof typeof STORE_FORMAT_LABEL])
        .join(", ") || "—"
    )
  }
  if (
    condition.campo === "socio_provincia" ||
    condition.campo === "tienda_region" ||
    condition.campo === "producto_marca" ||
    condition.campo === "producto_proveedor"
  ) {
    return condition.valor.join(", ") || "—"
  }
  if (condition.campo === "socio_antiguedad") {
    return `${condition.valor} meses o más`
  }
  if (condition.campo === "socio_edad") {
    return `${condition.valor} años o más`
  }
  return String(condition.valor)
}

/** Vista de solo-lectura del árbol de condiciones — bullets con sangría por profundidad + "Cumple TODAS/ALGUNA" cuando un grupo tiene más de un hijo, sin la fidelidad visual (chips) del editor. */
function ConditionNodeSummary({
  node,
  depth,
  categoryNameById,
  segmentNameById,
  couponBatchNameById,
  tierNameById,
  productNameById,
}: {
  node: ConditionNodeValues
  depth: number
  categoryNameById: Map<string, string>
  segmentNameById: Map<string, string>
  couponBatchNameById: Map<string, string>
  tierNameById: Map<string, string>
  productNameById: Map<string, string>
}) {
  const paddingLeft = depth * 12

  if (!isConditionGroup(node)) {
    return (
      <p className="text-xs text-foreground" style={{ paddingLeft }}>
        <span className="text-secondary-foreground">
          {CONDITION_FIELD_LABEL[node.campo]}:
        </span>{" "}
        <span className="font-medium">
          {conditionLeafSummary(
            node,
            categoryNameById,
            segmentNameById,
            couponBatchNameById,
            tierNameById,
            productNameById
          )}
        </span>
      </p>
    )
  }

  if (node.condiciones.length === 0) {
    return (
      <p
        className="text-xs text-muted-foreground italic"
        style={{ paddingLeft }}
      >
        Grupo vacío.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1" style={{ paddingLeft }}>
      {node.condiciones.length > 1 && (
        <p className="text-[11px] font-semibold text-muted-foreground">
          Cumple {node.combinador === "todas" ? "TODAS" : "ALGUNA"}:
        </p>
      )}
      {node.condiciones.map((child, index) => (
        <ConditionNodeSummary
          key={index}
          node={child}
          depth={depth + 1}
          categoryNameById={categoryNameById}
          segmentNameById={segmentNameById}
          couponBatchNameById={couponBatchNameById}
          tierNameById={tierNameById}
          productNameById={productNameById}
        />
      ))}
    </div>
  )
}

type PromotionReviewSummaryProps = {
  values: Partial<PromotionValues>
  categories: ConditionCategory[]
  segments: ConditionSegment[]
  products: ProductOption[]
  couponBatches: CouponBatchOption[]
  tiers: ConditionTier[]
  suppliers: SupplierOption[]
}

/** Paso 6 "Resumen" del stepper — revisión de todo lo capturado antes de guardar (no diseñado en el Figma de la regla). */
export function PromotionReviewSummary({
  values,
  categories,
  segments,
  products,
  couponBatches,
  tiers,
  suppliers,
}: PromotionReviewSummaryProps) {
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
  const segmentNameById = new Map(segments.map((s) => [s.id, s.name]))
  const productNameById = new Map(products.map((p) => [p.id, p.name]))
  const tierNameById = new Map(tiers.map((t) => [t.id, t.name]))
  const couponBatchNameById = new Map(couponBatches.map((b) => [b.id, b.name]))
  const supplierNameById = new Map(suppliers.map((s) => [s.id, s.name]))
  const conditionsTree = values.conditions

  return (
    <div className="flex w-full flex-col gap-4">
      <SummaryGroup title="Identidad">
        <SummaryRow label="Nombre" value={values.name || "—"} />
        <SummaryRow label="Código" value={values.code || "—"} />
        <SummaryRow
          label="Tipo"
          value={values.type ? PROMOTION_TYPE_LABEL[values.type] : "—"}
        />
        <SummaryRow label="Prioridad" value={String(values.priority ?? "—")} />
        <SummaryRow label="Acumulable" value={values.stackable ? "Sí" : "No"} />
        <SummaryRow
          label="Canal"
          value={
            values.channelScope ? CHANNEL_SCOPE_LABEL[values.channelScope] : "—"
          }
        />
      </SummaryGroup>

      <SummaryGroup title="Condiciones (SI)">
        {!conditionsTree || conditionsTree.condiciones.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sin condiciones — aplica a todos los clientes.
          </p>
        ) : (
          <ConditionNodeSummary
            node={conditionsTree}
            depth={0}
            categoryNameById={categoryNameById}
            segmentNameById={segmentNameById}
            couponBatchNameById={couponBatchNameById}
            tierNameById={tierNameById}
            productNameById={productNameById}
          />
        )}
      </SummaryGroup>

      <SummaryGroup title="Configuración de la mecánica">
        <SummaryRow
          label="Beneficio"
          value={
            values.benefitType ? BENEFIT_TYPE_LABEL[values.benefitType] : "—"
          }
        />
        {values.benefitType &&
        BENEFIT_TYPES_WITH_APPLY_TO.includes(values.benefitType) ? (
          <>
            {values.benefitType !== "descuento_escalonado" ? (
              <SummaryRow
                label="Valor"
                value={
                  values.benefitValue === undefined
                    ? "—"
                    : values.benefitType === "descuento_porcentual"
                      ? `${values.benefitValue} %`
                      : formatUSD(values.benefitValue)
                }
              />
            ) : (
              <>
                <SummaryRow
                  label="Umbral medido en"
                  value={
                    DISCOUNT_TIER_THRESHOLD_LABEL[
                      values.thresholdType ?? "unidades"
                    ]
                  }
                />
                <SummaryRow
                  label="Modo de cálculo"
                  value={
                    DISCOUNT_TIER_CALCULATION_MODE_LABEL[
                      values.tierCalculationMode ?? "escalon_unico"
                    ]
                  }
                />
                {(values.discountTiers ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Sin escalones definidos.
                  </p>
                ) : (
                  [...(values.discountTiers ?? [])]
                    .sort((a, b) => a.umbral - b.umbral)
                    .map((tier, index) => (
                      <SummaryRow
                        key={index}
                        label={`Escalón ${index + 1}`}
                        value={formatDiscountTier(
                          tier,
                          values.thresholdType ?? "unidades"
                        )}
                      />
                    ))
                )}
              </>
            )}
            <SummaryRow
              label="Tope máximo"
              value={values.maxCap ? formatUSD(values.maxCap) : "Sin tope"}
            />
            <SummaryRow
              label="Aplicar sobre"
              value={values.applyTo ? APPLY_TO_LABEL[values.applyTo] : "—"}
            />
          </>
        ) : values.benefitType === "envio_gratis" ? (
          <>
            <SummaryRow
              label="Tipo de beneficio"
              value={
                values.tipoBeneficioNoTransaccional
                  ? NON_TRANSACTIONAL_BENEFIT_TYPE_LABEL[
                      values.tipoBeneficioNoTransaccional
                    ]
                  : "—"
              }
            />
            <SummaryRow
              label="Monto mínimo"
              value={
                values.montoMinimoDisparo
                  ? formatUSD(values.montoMinimoDisparo)
                  : "Sin mínimo"
              }
            />
            <SummaryRow
              label="Validación requerida"
              value={values.validacionRequerida || "—"}
            />
            <SummaryRow
              label="Cupo disponible"
              value={String(values.cupoDisponible ?? "Sin límite")}
            />
            <SummaryRow
              label="Registra uso del cupo"
              value={values.registraUso ? "Sí" : "No"}
            />
          </>
        ) : values.benefitType === "producto_gratis" ? (
          <>
            <SummaryRow
              label="Producto comprado"
              value={
                values.productoCompradoId
                  ? (productNameById.get(values.productoCompradoId) ??
                    values.productoCompradoId)
                  : "—"
              }
            />
            <SummaryRow
              label="Cantidad mínima comprada"
              value={String(values.cantidadMinimaComprada ?? 1)}
            />
            <SummaryRow
              label="Producto de regalo"
              value={
                values.productoRegaloId
                  ? (productNameById.get(values.productoRegaloId) ??
                    values.productoRegaloId)
                  : "—"
              }
            />
            <SummaryRow
              label="Cantidad de regalo"
              value={String(values.cantidadRegalo ?? "—")}
            />
            <SummaryRow
              label="% de beneficio sobre el regalo"
              value={`${values.beneficioSobreRegaloPct ?? 100} %`}
            />
          </>
        ) : values.benefitType === "precio_fijo_bundle" ? (
          <>
            <SummaryRow
              label="Productos del bundle"
              value={
                (values.productosBundleIds ?? []).length > 0
                  ? (values.productosBundleIds ?? [])
                      .map((id) => productNameById.get(id) ?? id)
                      .join(", ")
                  : "—"
              }
            />
            <SummaryRow
              label="Precio fijo"
              value={values.benefitValue ? formatUSD(values.benefitValue) : "—"}
            />
          </>
        ) : values.benefitType === "por_piezas" ? (
          <>
            <SummaryRow
              label="Compra / paga"
              value={`Compra ${values.compraCantidad ?? "—"}, paga ${values.pagaCantidad ?? "—"}`}
            />
            <SummaryRow
              label="Alcance"
              value={
                values.alcancePiezas
                  ? BXGY_SCOPE_LABEL[values.alcancePiezas]
                  : "—"
              }
            />
            {values.alcancePiezas === "producto_especifico" && (
              <SummaryRow
                label="Producto"
                value={
                  values.productoCompradoId
                    ? (productNameById.get(values.productoCompradoId) ??
                      values.productoCompradoId)
                    : "—"
                }
              />
            )}
            <SummaryRow
              label="Descuento unidad extra"
              value={
                values.descuentoUnidadExtraPct
                  ? `${values.descuentoUnidadExtraPct} %`
                  : "—"
              }
            />
            {values.alcancePiezas !== "producto_especifico" && (
              <SummaryRow
                label="Mezclar SKUs del universo"
                value={values.mezclaEnUniverso ? "Sí" : "No"}
              />
            )}
          </>
        ) : values.benefitType === "multiplicador_puntos" ? (
          <>
            <SummaryRow
              label="Multiplicador"
              value={
                values.multiplicadorPuntos
                  ? `${values.multiplicadorPuntos}x puntos`
                  : "—"
              }
            />
            <SummaryRow
              label="Tope por ticket"
              value={values.maxCap ? formatUSD(values.maxCap) : "Sin tope"}
            />
            <SummaryRow
              label="Niveles"
              value={
                (values.nivelesRequeridos ?? []).length > 0
                  ? (values.nivelesRequeridos ?? [])
                      .map((t) => TIER_NAME_LABEL[t])
                      .join(", ")
                  : "Cualquier nivel"
              }
            />
            <SummaryRow
              label="Si otro multiplicador aplica"
              value={
                values.modoResolucionMultiplicador
                  ? MULTIPLIER_RESOLUTION_MODE_LABEL[
                      values.modoResolucionMultiplicador
                    ]
                  : "—"
              }
            />
            <SummaryRow
              label="Tipo de saldo"
              value={
                values.tipoSaldo ? BALANCE_TYPE_LABEL[values.tipoSaldo] : "—"
              }
            />
            <SummaryRow
              label="Momento de acreditación"
              value={
                values.momentoAcreditacion
                  ? ACCRUAL_TIMING_LABEL[values.momentoAcreditacion]
                  : "—"
              }
            />
            <SummaryRow
              label="Estado inicial"
              value={
                values.estadoInicial
                  ? BALANCE_INITIAL_STATE_LABEL[values.estadoInicial]
                  : "—"
              }
            />
          </>
        ) : values.benefitType === "bono_puntos" ? (
          <>
            <SummaryRow
              label="Puntos de bono"
              value={String(values.bonoPuntos ?? "—")}
            />
            <SummaryRow
              label="Monto mínimo"
              value={
                values.montoMinimoDisparo
                  ? formatUSD(values.montoMinimoDisparo)
                  : "Sin mínimo"
              }
            />
            <SummaryRow
              label="Evento que dispara"
              value={
                values.eventoGatillo
                  ? TRIGGER_EVENT_LABEL[values.eventoGatillo]
                  : "Solo por monto de carrito"
              }
            />
            <SummaryRow
              label="Tipo de saldo"
              value={
                values.tipoSaldo ? BALANCE_TYPE_LABEL[values.tipoSaldo] : "—"
              }
            />
            <SummaryRow
              label="Momento de acreditación"
              value={
                values.momentoAcreditacion
                  ? ACCRUAL_TIMING_LABEL[values.momentoAcreditacion]
                  : "—"
              }
            />
            <SummaryRow
              label="Estado inicial"
              value={
                values.estadoInicial
                  ? BALANCE_INITIAL_STATE_LABEL[values.estadoInicial]
                  : "—"
              }
            />
            <SummaryRow
              label="Requisito de alta"
              value={
                values.requisitoAlta
                  ? ENROLLMENT_REQUIREMENT_LABEL[values.requisitoAlta]
                  : "Ninguno"
              }
            />
            <SummaryRow
              label="Elegible en inactividad"
              value={values.elegibleEnInactividad ? "Sí" : "No"}
            />
          </>
        ) : values.benefitType === "emitir_cupon" ? (
          <>
            <SummaryRow
              label="Emisión"
              value={
                values.couponBatchId
                  ? (couponBatchNameById.get(values.couponBatchId) ??
                    values.couponBatchId)
                  : "—"
              }
            />
            <SummaryRow
              label="Monto mínimo"
              value={
                values.montoMinimoDisparo
                  ? formatUSD(values.montoMinimoDisparo)
                  : "Sin mínimo"
              }
            />
            <SummaryRow
              label="Umbral de puntos"
              value={String(values.umbralPuntos ?? "—")}
            />
            {values.umbralPuntos !== undefined && (
              <SummaryRow
                label="Momento de débito de puntos"
                value={
                  values.momentoDebitoPuntos
                    ? POINTS_DEBIT_TIMING_LABEL[values.momentoDebitoPuntos]
                    : "—"
                }
              />
            )}
            <SummaryRow
              label="Duración del cupón"
              value={
                values.duracionCuponDias
                  ? `${values.duracionCuponDias} días`
                  : "—"
              }
            />
            <SummaryRow label="Motivo" value={values.motivoEmision || "—"} />
            <SummaryRow
              label="Devolución si vence"
              value={values.devolucionSiVence ? "Sí" : "No"}
            />
            <SummaryRow
              label="Requisito de alta"
              value={
                values.requisitoAlta
                  ? ENROLLMENT_REQUIREMENT_LABEL[values.requisitoAlta]
                  : "Ninguno"
              }
            />
            <SummaryRow
              label="Elegible en inactividad"
              value={values.elegibleEnInactividad ? "Sí" : "No"}
            />
          </>
        ) : values.benefitType === "precio_especial" ? (
          <>
            <SummaryRow
              label="Producto"
              value={
                values.productoCompradoId
                  ? (productNameById.get(values.productoCompradoId) ??
                    values.productoCompradoId)
                  : "—"
              }
            />
            <SummaryRow
              label="Precio especial"
              value={
                values.precioPromocional
                  ? formatUSD(values.precioPromocional)
                  : "—"
              }
            />
            <SummaryRow
              label="Precio de referencia"
              value={
                values.precioReferencia
                  ? formatUSD(values.precioReferencia)
                  : "—"
              }
            />
            <SummaryRow
              label="Hasta agotar existencias"
              value={values.hastaAgotarExistencias ? "Sí" : "No"}
            />
            <SummaryRow
              label="Respeta precio mínimo legal"
              value={values.respetaPrecioMinimoLegal ? "Sí" : "No"}
            />
          </>
        ) : values.benefitType === "cashback" ? (
          <>
            <SummaryRow
              label={
                values.tipoMonedero === "monto_fijo"
                  ? "Monto de cashback"
                  : "Porcentaje de cashback"
              }
              value={
                values.benefitValue === undefined
                  ? "—"
                  : values.tipoMonedero === "monto_fijo"
                    ? formatUSD(values.benefitValue)
                    : `${values.benefitValue} %`
              }
            />
            <SummaryRow
              label="Monto mínimo de canje"
              value={
                values.montoMinimoCanje
                  ? formatUSD(values.montoMinimoCanje)
                  : "Sin mínimo"
              }
            />
            <SummaryRow
              label="Disponible a partir de"
              value={
                values.disponibilidadDias
                  ? `${values.disponibilidadDias} días`
                  : "Inmediato"
              }
            />
            <SummaryRow
              label="Vigencia del saldo"
              value={
                values.vigenciaSaldoDias
                  ? `${values.vigenciaSaldoDias} días`
                  : "Sin vencimiento"
              }
            />
          </>
        ) : values.benefitType === "descuento_continuidad" ? (
          <>
            {(values.discountTiers ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sin escalones definidos.
              </p>
            ) : (
              [...(values.discountTiers ?? [])]
                .sort((a, b) => a.umbral - b.umbral)
                .map((tier, index) => (
                  <SummaryRow
                    key={index}
                    label={`Escalón ${index + 1}`}
                    value={formatContinuityTier(tier)}
                  />
                ))
            )}
            <SummaryRow
              label="Ventana de continuidad"
              value={
                values.ventanaContinuidadDias
                  ? `${values.ventanaContinuidadDias} días`
                  : "—"
              }
            />
            <SummaryRow
              label="Al exceder la ventana"
              value={
                values.alRomperContinuidad
                  ? CONTINUITY_BREAK_BEHAVIOR_LABEL[values.alRomperContinuidad]
                  : "—"
              }
            />
            <SummaryRow
              label="Acumula compras retroactivas"
              value={values.acumulaRetroactivo ? "Sí" : "No"}
            />
            <SummaryRow
              label="Efecto de una devolución"
              value={
                values.efectoDevolucion
                  ? RETURN_EFFECT_LABEL[values.efectoDevolucion]
                  : "—"
              }
            />
            <SummaryRow
              label="Piezas que reciben el beneficio"
              value={
                values.criterioSeleccionPiezas
                  ? PIECE_SELECTION_CRITERION_LABEL[
                      values.criterioSeleccionPiezas
                    ]
                  : "—"
              }
            />
          </>
        ) : null}
      </SummaryGroup>

      <SummaryGroup title="Vigencia">
        <SummaryRow
          label="Desde"
          value={values.validFrom ? formatDate(values.validFrom) : "—"}
        />
        <SummaryRow
          label="Hasta"
          value={
            values.validUntil ? formatDate(values.validUntil) : "Permanente"
          }
        />
        <SummaryRow
          label="Días de la semana"
          value={
            values.daysOfWeek && values.daysOfWeek.length > 0
              ? values.daysOfWeek.map((d) => DAY_OF_WEEK_LABEL[d]).join(", ")
              : "Todos los días"
          }
        />
        <SummaryRow
          label="Horario"
          value={
            values.horaInicio || values.horaFin
              ? `${values.horaInicio ?? "00:00"} – ${values.horaFin ?? "23:59"}`
              : "Todo el día"
          }
        />
      </SummaryGroup>

      <SummaryGroup title="Límites y stacking">
        {values.limites && values.limites.length > 0 ? (
          <div className="flex flex-col gap-1">
            {values.limites.map((limit, i) => (
              <p key={i} className="text-xs text-secondary-foreground">
                {formatLimitRow(limit)}
              </p>
            ))}
          </div>
        ) : (
          <SummaryRow label="Límites" value="Sin límites" />
        )}
        <SummaryRow
          label="Presupuesto asignado"
          value={formatUSD(values.assignedBudget ?? 0)}
        />
        <SummaryRow
          label="Grupo de exclusión"
          value={values.exclusionGroup || "—"}
        />
        <SummaryRow
          label="Modo si hay múltiples"
          value={
            values.stackingMode ? STACKING_MODE_LABEL[values.stackingMode] : "—"
          }
        />
      </SummaryGroup>

      <SummaryGroup title="Economía">
        <SummaryRow
          label="Naturaleza del costo"
          value={
            values.naturalezaCosto
              ? COST_NATURE_LABEL[values.naturalezaCosto]
              : "—"
          }
        />
        <SummaryRow
          label="Financiador"
          value={
            values.financiador ? FINANCIADOR_LABEL[values.financiador] : "—"
          }
        />
        {values.financiador && values.financiador !== "retailer" && (
          <>
            <SummaryRow
              label="Proveedor"
              value={
                values.proveedorId
                  ? (supplierNameById.get(values.proveedorId) ??
                    values.proveedorId)
                  : "—"
              }
            />
            <SummaryRow label="Contrato" value={values.contratoId || "—"} />
            <SummaryRow
              label="% que absorbe el proveedor"
              value={
                values.porcentajeCostoProveedor !== undefined
                  ? `${values.porcentajeCostoProveedor}%`
                  : "—"
              }
            />
            <SummaryRow
              label="Liquidación"
              value={
                values.periodoLiquidacion
                  ? SETTLEMENT_PERIOD_LABEL[values.periodoLiquidacion]
                  : "—"
              }
            />
          </>
        )}
        <SummaryRow
          label="Aviso de presupuesto"
          value={
            values.umbralAlertaPresupuestoPct !== undefined
              ? `al ${values.umbralAlertaPresupuestoPct}%`
              : "Sin aviso configurado"
          }
        />
        <SummaryRow
          label="Nivel de aplicación"
          value={
            values.nivelAplicacion
              ? APPLICATION_LEVEL_LABEL[values.nivelAplicacion]
              : "—"
          }
        />
        <SummaryRow
          label="Base de precio"
          value={
            values.aplicaSobrePrecio
              ? PRICE_BASIS_LABEL[values.aplicaSobrePrecio]
              : "—"
          }
        />
        <SummaryRow
          label="Descuento acumula puntos"
          value={values.descuentoAcumulaPuntos ? "Sí" : "No"}
        />
        <SummaryRow
          label="Aplicabilidad sobre Rx"
          value={
            values.aplicaARx ? RX_APPLICABILITY_LABEL[values.aplicaARx] : "—"
          }
        />
        <SummaryRow
          label="Aprobación regulatoria"
          value={values.aprobacionRegulatoria ? "Aprobada" : "No aprobada"}
        />
      </SummaryGroup>
    </div>
  )
}
