import { formatCOP, formatFecha } from "@/lib/format"

import {
  APLICAR_SOBRE_LABEL,
  CANAL_APLICACION_LABEL,
  CAMPO_CONDICION_LABEL,
  TIPO_BENEFICIO_LABEL,
  TIPO_PROMOCION_LABEL,
  USOS_PERIODO_LABEL,
} from "../lib/labels"
import type { CategoriaCondicion, SegmentoCondicion } from "../lib/queries"
import type { PromocionValues } from "../schemas"

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-secondary-foreground">{etiqueta}</span>
      <span className="text-right font-medium text-foreground">{valor}</span>
    </div>
  )
}

function Grupo({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4 last:border-0 last:pb-0">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {titulo}
      </p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

type PromocionResumenRevisionProps = {
  valores: Partial<PromocionValues>
  categorias: CategoriaCondicion[]
  segmentos: SegmentoCondicion[]
}

/** Paso 5 "Resumen" del stepper — revisión de todo lo capturado antes de guardar (no diseñado en el Figma de la regla). */
export function PromocionResumenRevision({
  valores,
  categorias,
  segmentos,
}: PromocionResumenRevisionProps) {
  const categoriaNombrePorId = new Map(categorias.map((c) => [c.id, c.nombre]))
  const segmentoNombrePorId = new Map(segmentos.map((s) => [s.id, s.nombre]))
  const condiciones = valores.condiciones ?? []

  return (
    <div className="flex w-full flex-col gap-4">
      <Grupo titulo="Identidad">
        <Fila etiqueta="Nombre" valor={valores.nombre || "—"} />
        <Fila etiqueta="Código" valor={valores.codigo || "—"} />
        <Fila
          etiqueta="Tipo"
          valor={valores.tipo ? TIPO_PROMOCION_LABEL[valores.tipo] : "—"}
        />
        <Fila etiqueta="Prioridad" valor={String(valores.prioridad ?? "—")} />
        <Fila etiqueta="Acumulable" valor={valores.acumulable ? "Sí" : "No"} />
        <Fila
          etiqueta="Canal"
          valor={
            valores.canalAplicacion
              ? CANAL_APLICACION_LABEL[valores.canalAplicacion]
              : "—"
          }
        />
      </Grupo>

      <Grupo titulo="Condiciones (SI)">
        {condiciones.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sin condiciones — aplica a todos los clientes.
          </p>
        ) : (
          condiciones.map((condicion, index) => (
            <Fila
              key={index}
              etiqueta={CAMPO_CONDICION_LABEL[condicion.campo]}
              valor={
                condicion.campo === "categoria"
                  ? condicion.valor
                      .map((id) => categoriaNombrePorId.get(id) ?? id)
                      .join(", ") || "—"
                  : condicion.campo === "segmento"
                    ? (segmentoNombrePorId.get(condicion.valor) ??
                      condicion.valor)
                    : condicion.campo === "monto_carrito"
                      ? formatCOP(condicion.valor)
                      : String(condicion.valor)
              }
            />
          ))
        )}
      </Grupo>

      <Grupo titulo="Recompensa (ENTONCES)">
        <Fila
          etiqueta="Beneficio"
          valor={
            valores.tipoBeneficio
              ? TIPO_BENEFICIO_LABEL[valores.tipoBeneficio]
              : "—"
          }
        />
        <Fila
          etiqueta="Valor"
          valor={
            valores.valorBeneficio === undefined
              ? "—"
              : valores.tipoBeneficio === "descuento_porcentual"
                ? `${valores.valorBeneficio} %`
                : formatCOP(valores.valorBeneficio)
          }
        />
        <Fila
          etiqueta="Tope máximo"
          valor={
            valores.topeMaximo ? formatCOP(valores.topeMaximo) : "Sin tope"
          }
        />
        <Fila
          etiqueta="Aplicar sobre"
          valor={
            valores.aplicarSobre
              ? APLICAR_SOBRE_LABEL[valores.aplicarSobre]
              : "—"
          }
        />
        <Fila
          etiqueta="Usos por cliente"
          valor={
            valores.usosPorCliente
              ? `${valores.usosPorCliente} ${valores.usosPeriodo ? USOS_PERIODO_LABEL[valores.usosPeriodo] : ""}`
              : "Sin límite"
          }
        />
      </Grupo>

      <Grupo titulo="Vigencia">
        <Fila
          etiqueta="Desde"
          valor={valores.vigenteDesde ? formatFecha(valores.vigenteDesde) : "—"}
        />
        <Fila
          etiqueta="Hasta"
          valor={
            valores.vigenteHasta
              ? formatFecha(valores.vigenteHasta)
              : "Permanente"
          }
        />
        <Fila
          etiqueta="Presupuesto asignado"
          valor={formatCOP(valores.presupuestoAsignado ?? 0)}
        />
      </Grupo>
    </div>
  )
}
