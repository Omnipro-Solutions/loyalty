import bwipjs from "bwip-js/node"
import QRCode from "qrcode"

/**
 * QR/código de barras del vale, en servidor (Node) — usados tanto por
 * `/cupones/[id]` (un cupón) como por `/imprimir/cupones` (varios). Tinta
 * fija en negro/blanco puro, igual criterio que `CouponVoucher`: es una zona
 * pensada para imprimirse/escanearse, no debe depender del tema.
 */
export async function qrSvgFor(code: string): Promise<string> {
  return QRCode.toString(code, {
    type: "svg",
    margin: 0,
    color: { dark: "#000000", light: "#ffffff" },
  })
}

export function barcodeSvgFor(code: string): string {
  return bwipjs.toSVG({
    bcid: "code128",
    text: code,
    scale: 2,
    height: 10,
    includetext: false,
  })
}
