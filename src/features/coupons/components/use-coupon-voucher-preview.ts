"use client"

import { useEffect, useMemo, useState } from "react"
import bwipjs from "bwip-js/browser"
import QRCode from "qrcode"

/**
 * Genera el QR y el código de barras de la previsualización del asistente
 * — a diferencia del detalle del cupón (Fase 3, Server Component, una sola
 * vez), aquí el código cambia con cada tecla (prefijo, patrón…), así que se
 * regenera en el cliente. `bwip-js`.`toSVG` es síncrona en su build de
 * navegador (`useMemo` alcanza); `qrcode`.`toString` es async en ambos
 * builds, de ahí el `useEffect`.
 */
export function useCouponVoucherPreview(code: string) {
  const [qrSvg, setQrSvg] = useState("")

  const barcodeSvg = useMemo(() => {
    if (!code) return ""
    try {
      return bwipjs.toSVG({
        bcid: "code128",
        text: code,
        scale: 2,
        height: 10,
        includetext: false,
      })
    } catch {
      return ""
    }
  }, [code])

  useEffect(() => {
    if (!code) return
    let cancelled = false
    QRCode.toString(code, { type: "svg", margin: 0 })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg)
      })
      .catch(() => {
        if (!cancelled) setQrSvg("")
      })
    return () => {
      cancelled = true
    }
  }, [code])

  return { qrSvg, barcodeSvg }
}
