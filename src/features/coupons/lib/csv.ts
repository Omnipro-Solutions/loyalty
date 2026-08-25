export function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

export function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
