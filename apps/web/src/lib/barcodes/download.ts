export function barcodeDownloadName(value: string, extension: "svg" | "png") {
  const safeValue = value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 80);
  return `codigo-barra-${safeValue || "codigo"}.${extension}`;
}
