import { del, put } from "@vercel/blob";
import type { CoaRecord } from "@/lib/types";
import {
  compressPdf,
  isPdfBuffer,
  MAX_UPLOAD_SIZE,
} from "@/lib/compress-pdf";

export async function finalizeCoaUpload(
  blobUrl: string,
  fileName: string,
): Promise<CoaRecord> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error("Failed to read uploaded file.");
  }

  const input = new Uint8Array(await response.arrayBuffer());

  if (input.length > MAX_UPLOAD_SIZE) {
    throw new Error(`${fileName} is larger than 25MB.`);
  }

  const isPdf =
    isPdfBuffer(input) ||
    fileName.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error(`${fileName} is not a PDF.`);
  }

  const compressed = await compressPdf(input);
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
