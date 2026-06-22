import { formatFileSize } from "@/lib/format";

export const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
export const MAX_STORED_SIZE = 2 * 1024 * 1024;
const MIN_PDF_BYTES = 100;

const SAVE_OPTIONS = [
  "compress,compress-images,compress-fonts,garbage=4",
  "compress,compress-images,compress-fonts,garbage=deduplicate,sanitize,compress-effort=100",
] as const;

const RASTER_TIERS = [
  { scale: 1, quality: 75 },
  { scale: 0.85, quality: 65 },
  { scale: 0.7, quality: 55 },
  { scale: 0.55, quality: 45 },
  { scale: 0.45, quality: 35 },
] as const;

type MupdfModule = typeof import("mupdf");
type PDFDocument = import("mupdf").PDFDocument;

let mupdfModule: MupdfModule | null = null;

async function loadMupdf(): Promise<MupdfModule> {
  if (!mupdfModule) {
    mupdfModule = await import("mupdf");
  }
  return mupdfModule;
}

export function isPdfBuffer(input: Uint8Array): boolean {
  return (
    input.length >= 4 &&
    input[0] === 0x25 &&
    input[1] === 0x50 &&
    input[2] === 0x44 &&
    input[3] === 0x46
  );
}

function isUsablePdfOutput(output: Uint8Array): boolean {
  return output.length >= MIN_PDF_BYTES && isPdfBuffer(output);
}

function pickBetterOutput(current: Uint8Array, candidate: Uint8Array): Uint8Array {
  if (!isUsablePdfOutput(candidate)) {
    return current;
  }

  return candidate.length < current.length ? candidate : current;
}

function openPdf(mupdf: MupdfModule, input: Uint8Array): PDFDocument {
  const doc = mupdf.default.Document.openDocument(input, "application/pdf");

  if (doc.needsPassword()) {
    doc.destroy();
    throw new Error("Password-protected PDFs are not supported.");
  }

  const pdf = doc.asPDF();
  if (!pdf) {
    doc.destroy();
    throw new Error("Invalid PDF file.");
  }

  return pdf;
}

function savePdf(pdf: PDFDocument, options: string): Uint8Array {
  return pdf.saveToBuffer(options).asUint8Array();
}

function tryLosslessCompression(
  mupdf: MupdfModule,
  input: Uint8Array,
  aggressive: boolean,
): Uint8Array {
  let best = input;
  const tiers = aggressive ? SAVE_OPTIONS : [SAVE_OPTIONS[0]];

  for (const [index, options] of tiers.entries()) {
    let pdf: PDFDocument | null = null;

    try {
      pdf = openPdf(mupdf, input);

      if (aggressive && index === tiers.length - 1) {
        pdf.subsetFonts();
        pdf.bake(true, true);
      }

      const output = savePdf(pdf, options);
      best = pickBetterOutput(best, output);

      if (best.length <= MAX_STORED_SIZE && isUsablePdfOutput(best)) {
        return best;
      }
    } catch (error) {
      console.warn("PDF lossless compression tier failed:", error);
    } finally {
      pdf?.destroy();
    }
  }

  return best;
}

function rasterizePdf(
  mupdf: MupdfModule,
  input: Uint8Array,
  scale: number,
  jpegQuality: number,
): Uint8Array {
  const lib = mupdf.default;
  const src = lib.Document.openDocument(input, "application/pdf");
  const out = new lib.PDFDocument();
  const pageCount = src.countPages();

  try {
    for (let i = 0; i < pageCount; i++) {
      const page = src.loadPage(i);
      const bounds = page.getBounds();
      const width = bounds[2] - bounds[0];
      const height = bounds[3] - bounds[1];
      const matrix = lib.Matrix.scale(scale, scale);
      const pixmap = page.toPixmap(matrix, lib.ColorSpace.DeviceRGB, false);
      const jpeg = pixmap.asJPEG(jpegQuality);
      const image = new lib.Image(jpeg);
      const imageRef = out.addImage(image);
      const imageWidth = pixmap.getWidth();
      const imageHeight = pixmap.getHeight();

      const resources = out.newDictionary();
      const xObjects = out.newDictionary();
      xObjects.put("Im1", imageRef);
      resources.put("XObject", xObjects);

      const content = `q ${imageWidth} 0 0 ${imageHeight} 0 0 cm /Im1 Do Q\n`;
      out.addPage([0, 0, width, height], 0, resources, content);

      page.destroy();
      pixmap.destroy();
    }

    return savePdf(
      out,
      "compress,compress-images,compress-fonts,garbage=4",
    );
  } finally {
    src.destroy();
    out.destroy();
  }
}

export async function compressPdf(input: Uint8Array): Promise<Uint8Array> {
  if (input.length === 0) {
    throw new Error("PDF file is empty.");
  }

  if (!isPdfBuffer(input)) {
    throw new Error("Invalid PDF file.");
  }

  if (input.length <= MAX_STORED_SIZE) {
    return input;
  }

  const mupdf = await loadMupdf();
  const lossless = tryLosslessCompression(mupdf, input, true);
  if (lossless.length <= MAX_STORED_SIZE && isUsablePdfOutput(lossless)) {
    return lossless;
  }

  let best = isUsablePdfOutput(lossless) ? lossless : input;

  for (const tier of RASTER_TIERS) {
    try {
      const output = rasterizePdf(mupdf, input, tier.scale, tier.quality);
      best = pickBetterOutput(best, output);
      if (best.length <= MAX_STORED_SIZE && isUsablePdfOutput(best)) {
        return best;
      }
    } catch (error) {
      console.warn("PDF raster compression tier failed:", error);
    }
  }

  if (best.length <= MAX_STORED_SIZE && isUsablePdfOutput(best)) {
    return best;
  }

  throw new Error(
    `Could not compress below 2MB (best result: ${formatFileSize(best.length)}). Try a shorter document or fewer pages.`,
  );
}
