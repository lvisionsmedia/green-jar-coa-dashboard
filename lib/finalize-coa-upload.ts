import { del, put } from "@vercel/blob";
import type { CoaRecord } from "@/lib/types";
import {
  compressPdf,
  isPdfBuffer,
  MAX_UPLOAD_SIZE,
} from "@/lib/compress-pdf";

const MIN_PDF_BYTES = 1024;

async function fetchUploadedPdf(
  blobUrl: string,
  expectedSize: number,
): Promise<Uint8Array> {
  const delaysMs = [0, 400, 800, 1200, 1600, 2400, 3200];
  const minimumBytes = Math.max(
    MIN_PDF_BYTES,
    Math.floor(expectedSize * 0.9),
  );

  for (const delayMs of delaysMs) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const response = await fetch(blobUrl, { cache: "no-store" });
    if (!response.ok) {
      continue;
    }

    const data = new Uint8Array(await response.arrayBuffer());
    if (
      data.length >= minimumBytes &&
      isPdfBuffer(data)
    ) {
      return data;
    }
  }

  throw new Error(
    "Uploaded file was empty or not ready yet. Please try again.",
  );
}

export async function finalizeCoaUpload(
  blobUrl: string,
  fileName: string,
  expectedSize?: number,
): Promise<CoaRecord> {
  if (!expectedSize || expectedSize <= 0) {
    throw new Error(
      `${fileName}: missing upload size. Please refresh and try again.`,
    );
  }

  const input = await fetchUploadedPdf(blobUrl, expectedSize);

  if (input.length > MAX_UPLOAD_SIZE) {
    throw new Error(`${fileName} is larger than 25MB.`);
  }

  const compressed = await compressPdf(input);
  const minimumBytes = Math.max(MIN_PDF_BYTES, Math.floor(input.length * 0.02));

  if (compressed.length < minimumBytes || !isPdfBuffer(compressed)) {
    throw new Error(`${fileName}: Compression produced an invalid PDF.`);
  }

  const id = crypto.randomUUID();

  const blob = await put(`coas/${id}.pdf`, Buffer.from(compressed), {
    access: "public",
    contentType: "application/pdf",
  });

  try {
    await del(blobUrl);
  } catch (error) {
    console.warn("Failed to delete temporary upload blob:", error);
  }

  return {
    id,
    fileName,
    blobUrl: blob.url,
    fileSize: compressed.length,
    uploadedAt: new Date().toISOString(),
  };
}
