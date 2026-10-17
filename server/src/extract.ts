// Turns an uploaded file into [{ page, text }]. Throws AppError on bad input.
import pdf from "pdf-parse/lib/pdf-parse.js";
import { AppError } from "./errors";

export type PageText = { page: number; text: string };

export const ALLOWED = new Set(["application/pdf", "text/plain", "text/markdown"]);

export async function extractText(buf: Buffer, mime: string, filename: string): Promise<PageText[]> {
  let pages: PageText[];
  try {
    if (mime === "application/pdf") {
      const out: string[] = [];
      await pdf(buf, {
        pagerender: async (page: any) => {
          const tc = await page.getTextContent();
          const text = tc.items.map((i: any) => i.str).join(" ");
          out.push(text);
          return text;
        },
      });
      pages = out.map((text, i) => ({ page: i + 1, text }));
    } else {
      pages = [{ page: 1, text: buf.toString("utf8") }];
    }
  } catch {
    throw new AppError(422, `Could not read "${filename}". The file may be corrupted or password-protected.`);
  }
  pages = pages.map((p) => ({ ...p, text: p.text.replace(/\s+/g, " ").trim() })).filter((p) => p.text.length > 0);
  if (pages.length === 0) {
    throw new AppError(422, `No extractable text in "${filename}" (scanned PDFs need OCR).`);
  }
  return pages;
}
