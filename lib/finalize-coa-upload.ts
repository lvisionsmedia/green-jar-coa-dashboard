import { del, put } from "@vercel/blob";
import type { CoaRecord } from "@/lib/types";
import {
  compressPdf,
  isPdfBuffer,
  MAX_UPLOAD_SIZE,
} from "@/lib/compress-pdf";

async function fetchUploadedPdf(blobUrl: string): Promise<Uint8Array> {
  const delaysMs = [0, 400, 800, 1200, 1600];

  for (const delayMs of delaysMs) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const response = await fetch(blobUrl, { cache: "no-store" });
    if (!response.ok) {
      continue;
    }

    const data = new Uint8Array(await response.arrayBuffer());
    if (data.length > 0 && isPdfBuffer(data)) {
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
  const input = await fetchUploadedPdf(blobUrl);

  if (expectedSize && expectedSize > 0 && input.length < expectedSize * 0.9) {
    throw new Error(
      `${fileName} did not finish uploading completely. Please try again.`,
    );
  }

  if (input.length > MAX_UPLOAD_SIZE) {
    throw new Error(`${fileName} is larger than 25MB.`);
  }

  const compressed = await compressPdf(input);

  if (compressed.length === 0 || !isPdfBuffer(compressed)) {
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
