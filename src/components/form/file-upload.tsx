"use client"

import { ImageIcon, Upload, X } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

type FileUploadProps = {
  label: string
  file?: { name: string; size: string; dimensions?: string } | null
  onFileSelected?: (file: File) => void
  onRemove?: () => void
  accept?: string
  hint?: string
  className?: string
}

/** Figma "Form / Carga de archivo" (709:405): Default (dashed) / Dragging / With file. */
export function FileUpload({
  label,
  file,
  onFileSelected,
  onRemove,
  accept = "image/png,image/jpeg",
  hint = "PNG o JPG · máx. 5 MB",
  className,
}: FileUploadProps) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    const f = files?.[0]
    if (f) onFileSelected?.(f)
  }

  return (
    <div className={cn("flex w-[320px] flex-col gap-1.5", className)}>
      <p className="text-[12px] leading-[17px] font-medium text-muted-foreground">
        {label}
      </p>

      {file ? (
        <div className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-[11px]">
          <div className="flex size-[38px] shrink-0 items-center justify-center rounded-lg bg-avatar-indigo-bg">
            <ImageIcon className="size-[17px] text-avatar-indigo-fg" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] leading-[17px] font-medium text-foreground">
              {file.name}
            </p>
            <p className="text-[10px] leading-[14px] text-muted-foreground">
              {file.size}
              {file.dimensions ? ` · ${file.dimensions}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar archivo"
            className="shrink-0 text-muted-foreground"
          >
            <X className="size-[15px]" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            "flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-[22px] text-center",
            dragging
              ? "border-primary bg-accent"
              : "border-border-strong bg-neutral-50"
          )}
        >
          <Upload
            className={cn(
              "size-[22px]",
              dragging ? "text-accent-foreground" : "text-muted-foreground"
            )}
          />
          <p
            className={cn(
              "text-[12px] leading-[17px] font-medium",
              dragging ? "text-accent-foreground" : "text-foreground"
            )}
          >
            {dragging ? "Suelta para subir" : "Arrastra una imagen o haz clic"}
          </p>
          <p className="text-[11px] leading-[15px] text-muted-foreground">
            {hint}
          </p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
