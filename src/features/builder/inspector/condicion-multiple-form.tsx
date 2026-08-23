"use client"

import { Plus, Trash2 } from "lucide-react"
import { useAction } from "next-safe-action/hooks"
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  QueryBuilder,
  RuleComponents,
  RuleGroupBodyComponents,
  useRule,
  useRuleGroup,
  useStopEventPropagation,
  type CombinatorSelectorProps,
  type Field,
  type FieldSelectorProps,
  type RuleGroupProps,
  type RuleGroupType,
  type RuleProps,
  type ValueEditorProps,
  type ValueSelectorProps,
} from "react-querybuilder"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

import { previsualizarCondicionAction } from "./actions"
import {
  aplanarConteos,
  contarReglasYProfundidad,
  type ConteoNodo,
  type SiFaltaElDato,
} from "./condicion-preview"
import { FieldSlashAutocomplete } from "./field-slash-autocomplete"

/**
 * Caso difícil #2 del plan: grupos anidados Y/O con `react-querybuilder`
 * headless (todos los `controlElements` son componentes propios con los
 * tokens de este proyecto — nunca el estilo por defecto de la librería) +
 * autocompletado de atributos con `/` (ver `field-slash-autocomplete.tsx`)
 * + "Resultado estimado" real contra `members` (Figma `1114:4478`).
 *
 * A propósito NO se importa `react-querybuilder/dist/query-builder.css`: en
 * modo headless esa hoja no aporta nada que no reimplementemos ya vía
 * clases propias, y en cambio su regla `.ruleGroup { background:
 * color-mix(...#004bb8 20%) }` competía por especificidad con nuestras
 * propias clases de Tailwind en el mismo div — es la causa real del fondo
 * azul poco profesional que se reportó antes.
 */

const OPERADORES_COMPARACION = [
  { name: "=", value: "=", label: "es igual a" },
  { name: "!=", value: "!=", label: "es distinto de" },
]

const OPERADORES_NUMERICOS = [
  { name: "=", value: "=", label: "es igual a" },
  { name: "!=", value: "!=", label: "es distinto de" },
  { name: "<", value: "<", label: "menor que" },
  { name: "<=", value: "<=", label: "menor o igual a" },
  { name: ">", value: ">", label: "mayor que" },
  { name: ">=", value: ">=", label: "mayor o igual a" },
]

const SI_NO = [
  { name: "true", label: "Sí" },
  { name: "false", label: "No" },
]

/**
 * Atributos expuestos para segmentar (criterio de producto: los campos de
 * `members` más útiles para condicionar un journey de lealtad — no se
 * expone todo el modelo, ej. documento de identidad o teléfono no tienen
 * sentido como segmentación). Los operadores se fijan por campo en vez de
 * dejar que `react-querybuilder` infiera un set por `inputType`, para
 * poder darles etiquetas en español sin arrastrar operadores de texto
 * ("contiene", "empieza con"…) que no aplican a estos campos. Valores de
 * los `select` verificados contra los `check` reales de la columna en
 * `20260823110000_clientes_perfil.sql` — no inventados.
 */
const CAMPOS: Field[] = [
  {
    name: "tier",
    label: "Nivel",
    valueEditorType: "select",
    values: [
      { name: "bronce", label: "Bronce" },
      { name: "plata", label: "Plata" },
      { name: "oro", label: "Oro" },
      { name: "diamante", label: "Diamante" },
    ],
    operators: OPERADORES_COMPARACION,
  },
  {
    name: "saldo_puntos",
    label: "Saldo de puntos",
    inputType: "number",
    operators: OPERADORES_NUMERICOS,
  },
  {
    name: "fecha_alta",
    label: "Fecha de alta",
    inputType: "date",
    operators: OPERADORES_NUMERICOS,
  },
  {
    name: "genero",
    label: "Género",
    valueEditorType: "select",
    values: [
      { name: "femenino", label: "Femenino" },
      { name: "masculino", label: "Masculino" },
      { name: "otro", label: "Otro" },
      { name: "prefiere_no_decir", label: "Prefiere no decir" },
    ],
    operators: OPERADORES_COMPARACION,
  },
  {
    name: "canal_adquisicion",
    label: "Canal de adquisición",
    valueEditorType: "select",
    values: [
      { name: "pos", label: "POS" },
      { name: "ecommerce", label: "E-commerce" },
      { name: "app", label: "App" },
      { name: "referido", label: "Referido" },
      { name: "campana", label: "Campaña" },
      { name: "otro", label: "Otro" },
    ],
    operators: OPERADORES_COMPARACION,
  },
  {
    name: "estado_cuenta",
    label: "Estado de cuenta",
    valueEditorType: "select",
    values: [
      { name: "activo", label: "Activo" },
      { name: "inactivo", label: "Inactivo" },
      { name: "suspendido", label: "Suspendido" },
    ],
    operators: OPERADORES_COMPARACION,
  },
  {
    name: "tiene_hijos",
    label: "Tiene hijos",
    valueEditorType: "select",
    values: SI_NO,
    operators: OPERADORES_COMPARACION,
  },
  {
    name: "tiene_mascotas",
    label: "Tiene mascotas",
    valueEditorType: "select",
    values: SI_NO,
    operators: OPERADORES_COMPARACION,
  },
  {
    name: "consentimiento_marketing",
    label: "Consiente marketing",
    valueEditorType: "select",
    values: SI_NO,
    operators: OPERADORES_COMPARACION,
  },
  {
    name: "provincia",
    label: "Provincia",
    inputType: "text",
    operators: OPERADORES_COMPARACION,
  },
]

const AUTOCOMPLETE_FIELDS = CAMPOS.map((f) => ({
  name: String(f.name),
  label: f.label,
}))

/** Operador y valor por defecto al agregar una condición desde la barra de búsqueda rápida — mismo criterio "primer valor razonable" que ya aplica `autoSelectOperator`/`autoSelectValue` de `react-querybuilder` para el resto de los flujos de alta. */
const PRIMER_OPERADOR: Record<string, string> = {
  tier: OPERADORES_COMPARACION[0].name,
  saldo_puntos: OPERADORES_NUMERICOS[0].name,
  fecha_alta: OPERADORES_NUMERICOS[0].name,
}
const VALOR_INICIAL: Record<string, string> = {
  tier: "bronce",
  saldo_puntos: "",
  fecha_alta: "",
}

/** Conteos reales de la última corrida de "Resultado estimado" (`null` mientras no ha llegado la primera respuesta). Un `Map` por id de nodo es más cómodo de consumir desde `RuleControl`/`RuleGroupControl` que volver a recorrer el árbol en cada uno. */
const PreviewContext = createContext<{
  conteos: Map<string, ConteoNodo>
  totalMiembros: number
} | null>(null)

/** "Contraer todo" (Figma, junto a "CONDICIONES · N en M niveles") — un solo interruptor global, no un chevron por grupo: colapsa el cuerpo de CADA `RuleGroupControl` (reglas + botones de agregar) dejando visible solo su encabezado (badge + Alcance), para poder ver de un vistazo cuántos grupos/niveles tiene un árbol grande sin desplazarse por todo. */
const ColapsoContext = createContext(false)

function FieldSelectorControl(props: FieldSelectorProps) {
  return (
    <FieldSlashAutocomplete
      fields={AUTOCOMPLETE_FIELDS}
      value={props.value ?? ""}
      onSelect={props.handleOnChange}
    />
  )
}

/**
 * `react-querybuilder` permite agrupar opciones (`OptionGroup`), pero
 * nunca les pasamos grupos — esto solo aplana el tipo para no pelear con
 * la unión `T | OptionGroup<T>` en los controles de abajo.
 */
function aplanar<T extends { name: string }>(
  options: readonly (T | { label: string; options: readonly T[] })[]
): T[] {
  return options.flatMap((o) => ("options" in o ? [...o.options] : [o]))
}

/**
 * Conector Y/O entre condiciones (Figma: píldora + línea horizontal). Con
 * `showCombinatorsBetweenRules` (ver más abajo) este control se repite
 * entre cada par de condiciones del mismo grupo — con una sola condición
 * no hay nada que conectar, así que simplemente no aparece.
 */
function CombinatorSelectorControl(props: CombinatorSelectorProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <div className="flex shrink-0 overflow-hidden rounded-full border border-border bg-background text-[11px] font-semibold">
        {aplanar(props.options).map((opt) => (
          <button
            key={String(opt.name)}
            type="button"
            onClick={() => props.handleOnChange(opt.name)}
            className={cn(
              "px-2.5 py-1",
              props.value === opt.name
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

/** Busca la etiqueta de una opción por `name` — `undefined` si no hay match (campo recién creado sin valor todavía). */
function etiquetaDe<T extends { name: string; label: string }>(
  opciones: T[],
  valor: string | undefined
) {
  return opciones.find((o) => o.name === valor)?.label
}

/**
 * Selector de operador — fondo violeta sutil (mismo tono que el grupo
 * "Lógica" del catálogo de bloques) para distinguirlo visualmente del campo
 * y del valor. `<SelectValue>` de Base UI NO resuelve automáticamente la
 * etiqueta del `<SelectItem>` seleccionado — sin el `children` de función
 * de abajo, el trigger cerrado muestra el `value` crudo (p. ej. ">="
 * en vez de "mayor o igual a"). Mismo patrón ya usado en `condicion-row.tsx`.
 */
function ValueSelectorControl(props: ValueSelectorProps) {
  const opciones = aplanar(props.options)
  return (
    <Select value={props.value} onValueChange={props.handleOnChange}>
      <SelectTrigger className="h-9 w-fit max-w-[170px] shrink-0 gap-1 border-transparent bg-avatar-violet-bg px-2.5 text-avatar-violet-fg data-placeholder:text-avatar-violet-fg">
        <SelectValue placeholder="Selecciona">
          {(v: string) => etiquetaDe(opciones, v) ?? v}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {opciones.map((opt) => (
          <SelectItem key={String(opt.name)} value={String(opt.name)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ValueEditorControl(props: ValueEditorProps) {
  if (props.fieldData?.valueEditorType === "select") {
    // `ValueEditorProps` trae las opciones en `values` (de `fieldData.values`),
    // no en `options` como `ValueSelectorProps` — reusar `ValueSelectorControl`
    // vía cast leía `props.options`, que siempre es `undefined` aquí y
    // reventaba `aplanar` con "Cannot read properties of undefined
    // (reading 'flatMap')" al abrir cualquier condición sobre "Nivel".
    const opciones = aplanar(props.values ?? [])
    return (
      <Select value={props.value ?? ""} onValueChange={props.handleOnChange}>
        <SelectTrigger className="h-9 w-fit max-w-[120px] shrink-0 gap-1 px-2.5">
          <SelectValue placeholder="Selecciona">
            {(v: string) => etiquetaDe(opciones, v) ?? v}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {opciones.map((opt) => (
            <SelectItem key={String(opt.name)} value={String(opt.name)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return (
    <Input
      type={
        props.inputType === "date"
          ? "date"
          : props.inputType === "number"
            ? "number"
            : "text"
      }
      value={props.value ?? ""}
      onChange={(e) => props.handleOnChange(e.target.value)}
      className="h-9 w-[110px] shrink-0 px-2.5"
    />
  )
}

type AccionControlProps = {
  handleOnClick: (e?: React.MouseEvent) => void
  label?: ReactNode
  title?: string
}

function AddActionControl({ handleOnClick, label, title }: AccionControlProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title={title}
      onClick={(e) => handleOnClick(e)}
    >
      <Plus className="size-3.5" />
      {label}
    </Button>
  )
}

function RemoveActionControl({ handleOnClick, title }: AccionControlProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Eliminar"
      title={title}
      onClick={(e) => handleOnClick(e)}
    >
      <Trash2 className="size-3.5 text-destructive" />
    </Button>
  )
}

const COMBINADORES_LARGOS = [
  { name: "and", label: "todas las condiciones" },
  { name: "or", label: "al menos una condición" },
]

/**
 * Grupo de condiciones custom (Figma: frase en lenguaje natural + badge
 * "Grupo principal"/"Subgrupo · nivel N" + "Alcance" real). Se construye
 * sobre `useRuleGroup`/`RuleGroupBodyComponents` (los mismos hooks que usa
 * el `RuleGroup` por defecto de `react-querybuilder`) en vez de aceptar el
 * layout por defecto — así se puede insertar la insignia de alcance en el
 * encabezado de CADA grupo (raíz y subgrupos) sin reimplementar a mano la
 * recursión de reglas/subgrupos ni los conectores Y/O entre filas.
 */
function RuleGroupControl(props: RuleGroupProps) {
  const rg = useRuleGroup(props)
  const addRule = useStopEventPropagation(rg.addRule)
  const addGroup = useStopEventPropagation(rg.addGroup)
  const removeGroup = useStopEventPropagation(rg.removeGroup)
  const preview = useContext(PreviewContext)
  const colapsado = useContext(ColapsoContext)

  const esRaiz = rg.path.length === 0
  const totalHijos = rg.ruleGroup.rules.length
  const nodo = preview?.conteos.get(rg.id ?? "")
  const alcance = nodo?.tipo === "grupo" ? nodo.alcance : undefined
  const pct =
    esRaiz &&
    typeof alcance === "number" &&
    preview &&
    preview.totalMiembros > 0
      ? Math.round((alcance / preview.totalMiembros) * 100)
      : undefined

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        !esRaiz &&
          "rounded-xl border border-dashed border-border bg-muted/40 p-3"
      )}
    >
      <div className="flex flex-col gap-1.5">
        {totalHijos >= 2 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-foreground">
            <span>
              {esRaiz
                ? "El cliente entra si cumple"
                : "Dentro de este grupo, si cumple"}
            </span>
            <Select
              value={rg.combinator}
              onValueChange={(v) => rg.onCombinatorChange(v)}
            >
              <SelectTrigger className="h-7 w-fit gap-1 border-transparent bg-muted px-2 text-xs font-semibold">
                <SelectValue>
                  {(v: string) =>
                    COMBINADORES_LARGOS.find((c) => c.name === v)?.label ?? v
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {COMBINADORES_LARGOS.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
            {esRaiz
              ? "Grupo principal"
              : `Subgrupo · nivel ${rg.path.length + 1}`}
          </span>
          <span className="h-px flex-1 bg-border" />
          {typeof alcance === "number" && (
            <span className="shrink-0">
              Alcance{" "}
              <b className="font-semibold text-foreground">
                {formatNumber(alcance)}
              </b>
              {typeof pct === "number" &&
                ` de ${formatNumber(preview!.totalMiembros)} (${pct}%)`}
            </span>
          )}
        </div>
      </div>

      {!colapsado && (
        <>
          <div className="flex flex-col gap-2">
            <RuleGroupBodyComponents {...rg} />
          </div>

          <div className="flex items-center gap-2">
            <AddActionControl
              handleOnClick={addRule}
              label={esRaiz ? "Condición" : "Condición en este subgrupo"}
              title="Agregar condición"
            />
            <AddActionControl
              handleOnClick={addGroup}
              label="Subgrupo"
              title="Agregar subgrupo"
            />
            {!esRaiz && (
              <RemoveActionControl
                handleOnClick={removeGroup}
                title="Eliminar subgrupo"
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

/** Fila de condición custom: misma composición de campo/operador/valor/eliminar que ya usaba `react-querybuilder` (`RuleComponents`, con los controles registrados en `CONTROL_ELEMENTS`) + una línea "Cumplen N" real debajo. */
function RuleControl(props: RuleProps) {
  const r = useRule(props)
  const removeRule = useStopEventPropagation(r.removeRule)
  const preview = useContext(PreviewContext)
  const nodo = preview?.conteos.get(r.id ?? "")
  const cumplen = nodo?.tipo === "regla" ? nodo.cumplen : undefined

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 shadow-form-section">
      <div className="flex flex-wrap items-center gap-2">
        <RuleComponents {...r} removeRule={removeRule} />
      </div>
      {typeof cumplen === "number" && (
        <p className="text-[11px] text-muted-foreground">
          Cumplen{" "}
          <span className="font-semibold text-foreground">
            {formatNumber(cumplen)}
          </span>
        </p>
      )}
    </div>
  )
}

const CONTROL_ELEMENTS = {
  ruleGroup: RuleGroupControl,
  rule: RuleControl,
  fieldSelector: FieldSelectorControl,
  combinatorSelector: CombinatorSelectorControl,
  operatorSelector: ValueSelectorControl,
  valueEditor: ValueEditorControl,
  addRuleAction: AddActionControl,
  addGroupAction: AddActionControl,
  removeRuleAction: RemoveActionControl,
  removeGroupAction: RemoveActionControl,
}

const QUERY_VACIA: RuleGroupType = { combinator: "and", rules: [] }

// react-querybuilder trae sus textos en inglés por defecto ("AND"/"OR",
// "+ Rule"/"+ Group") — el resto de la app está en español, así que se
// sobreescriben explícitamente en vez de dejar el default de la librería.
const COMBINADORES = [
  { name: "and", value: "and", label: "Y" },
  { name: "or", value: "or", label: "O" },
]

const SI_FALTA_EL_DATO_OPCIONES: { name: SiFaltaElDato; label: string }[] = [
  { name: "no_cumple", label: "No cumple" },
  { name: "si_cumple", label: "Sí cumple" },
  { name: "omitir", label: "Omitir" },
]

export function CondicionMultipleForm({
  config,
  onChange,
}: {
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}) {
  const query = (config.condiciones as RuleGroupType | undefined) ?? QUERY_VACIA
  const siFaltaElDato =
    (config.siFaltaElDato as SiFaltaElDato | undefined) ?? "no_cumple"
  const { reglas, profundidad } = useMemo(
    () => contarReglasYProfundidad(query),
    [query]
  )

  const [preview, setPreview] = useState<{
    conteos: Map<string, ConteoNodo>
    totalMiembros: number
  } | null>(null)
  const [colapsado, setColapsado] = useState(false)

  const previsualizar = useAction(previsualizarCondicionAction, {
    onSuccess: ({ data }) => {
      if (!data?.ok) return
      setPreview({
        conteos: aplanarConteos(data.conteos),
        totalMiembros: data.totalMiembros,
      })
    },
  })

  useEffect(() => {
    const t = setTimeout(() => {
      previsualizar.execute({ condiciones: query, siFaltaElDato })
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe re-disparar cuando cambia el árbol de condiciones o la política de dato faltante, no cuando cambia la identidad de `execute`.
  }, [query, siFaltaElDato])

  function agregarCondicionRapida(fieldName: string) {
    onChange({
      ...config,
      condiciones: {
        ...query,
        rules: [
          ...query.rules,
          {
            id: crypto.randomUUID(),
            field: fieldName,
            operator: PRIMER_OPERADOR[fieldName] ?? "=",
            value: VALOR_INICIAL[fieldName] ?? "",
            valueSource: "value" as const,
          },
        ],
      },
    })
  }

  return (
    <PreviewContext.Provider value={preview}>
      <ColapsoContext.Provider value={colapsado}>
        <div className="flex flex-col gap-3">
          <FieldSlashAutocomplete
            fields={AUTOCOMPLETE_FIELDS}
            value=""
            onSelect={agregarCondicionRapida}
            placeholder="Escribe un atributo… ej. tier, saldo, fecha"
            className="w-full"
            mostrarAtajo
          />

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium tracking-[0.2px] text-muted-foreground">
              <span className="uppercase">Condiciones</span> · {reglas} en{" "}
              {profundidad} {profundidad === 1 ? "nivel" : "niveles"}
            </p>
            <button
              type="button"
              onClick={() => setColapsado((c) => !c)}
              className="shrink-0 text-[11px] font-medium text-primary"
            >
              {colapsado ? "Expandir todo" : "Contraer todo"}
            </button>
          </div>

          <QueryBuilder
            fields={CAMPOS}
            query={query}
            onQueryChange={(q) => onChange({ ...config, condiciones: q })}
            controlElements={CONTROL_ELEMENTS}
            combinators={COMBINADORES}
            showCombinatorsBetweenRules
            controlClassnames={{
              queryBuilder: "flex flex-col gap-3",
              betweenRules: "py-0.5",
              // Sin esto, cuando el campo+operador+valor no caben en una
              // sola línea el ícono de eliminar cae solo a la izquierda en
              // su propia línea, como huérfano — `ml-auto` lo ancla siempre
              // al borde derecho de la fila (comparta línea con el valor o no).
              removeRule: "ml-auto",
            }}
            accessibleDescriptionGenerator={() => ""}
          />

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-[11px] font-medium tracking-[0.2px] text-muted-foreground uppercase">
              Si falta el dato
            </p>
            <div className="flex overflow-hidden rounded-lg border border-border text-[12px] font-medium">
              {SI_FALTA_EL_DATO_OPCIONES.map((opt) => (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() =>
                    onChange({ ...config, siFaltaElDato: opt.name })
                  }
                  className={cn(
                    "flex-1 px-2.5 py-1.5",
                    siFaltaElDato === opt.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Aplica cuando el atributo no existe en el perfil del socio.
            </p>
          </div>
        </div>
      </ColapsoContext.Provider>
    </PreviewContext.Provider>
  )
}
