import mupdf, { PDFDocument } from "mupdf";
import { formatFileSize } from "@/lib/format";

export const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
export const MAX_STORED_SIZE = 2 * 1024 * 1024;

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

function openPdf(input: Uint8Array): PDFDocument {
  const doc = mupdf.Document.openDocument(input, "application/pdf");

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

function tryLosslessCompression(input: Uint8Array): Uint8Array {
  let best = input;

  for (const [index, options] of SAVE_OPTIONS.entries()) {
    const pdf = openPdf(input);

    if (index === SAVE_OPTIONS.length - 1) {
      pdf.subsetFonts();
      pdf.bake(true, true);
    }

    const output = savePdf(pdf, options);
    pdf.destroy();

    if (output.length < best.length) {
      best = output;
    }

    if (best.length <= MAX_STORED_SIZE) {
      return best;
    }
  }

  return best;
}

function rasterizePdf(
  input: Uint8Array,
  scale: number,
  jpegQuality: number,
): Uint8Array {
  const src = mupdf.Document.openDocument(input, "application/pdf");
  const out = new mupdf.PDFDocument();
  const pageCount = src.countPages();

  try {
    for (let i = 0; i < pageCount; i++) {
      const page = src.loadPage(i);
      const bounds = page.getBounds();
      const width = bounds[2] - bounds[0];
      const height = bounds[3] - bounds[1];
      const matrix = mupdf.Matrix.scale(scale, scale);
      const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);
      const jpeg = pixmap.asJPEG(jpegQuality);
      const image = new mupdf.Image(jpeg);
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

export function compressPdf(input: Uint8Array): Uint8Array {
  if (input.length <= MAX_STORED_SIZE) {
    const compressed = tryLosslessCompression(input);
    return compressed.length < input.length ? compressed : input;
  }

  const lossless = tryLosslessCompression(input);
  if (lossless.length <= MAX_STORED_SIZE) {
    return lossless;
  }

  let best = lossless;

  for (const tier of RASTER_TIERS) {
    const output = rasterizePdf(input, tier.scale, tier.quality);
    if (output.length < best.length) {
      best = output;
    }
    if (output.length <= MAX_STORED_SIZE) {
      return output;
    }
  }

  throw new Error(
    `Could not compress below 2MB (best result: ${formatFileSize(best.length)}). Try a shorter document or fewer pages.`,
  );
}
