import { Router } from "express";
import { pool, toVector } from "./db";
import { extractText } from "./extract";
import { chunkPages } from "./chunker";
import { embed, answer, type Passage } from "./ai";
import { AppError } from "./errors";
import { askLimiter, uploadLimiter } from "./rateLimiters";
import { MAX_CHUNKS, upload, validateUpload } from "./uploadValidation";
import { askSchema, idParamSchema, validate } from "./validate";

export const router = Router();

// limiter -> multer -> content checks -> handler
router.post("/documents", uploadLimiter, upload.single("file"), validateUpload, async (req, res) => {
  const userId = req.userId!;
  const { originalname, mimetype, buffer } = req.file!;

  const pages = await extractText(buffer, mimetype, originalname);
  const chunks = chunkPages(pages);
  if (chunks.length > MAX_CHUNKS) {
    throw new AppError(413, "This document is too large to process. Try a smaller file.");
  }
  const vectors = await embed(chunks.map((c) => c.content));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const doc = await client.query(
      "INSERT INTO documents (user_id, filename, mime, chunk_count) VALUES ($1,$2,$3,$4) RETURNING id, filename, chunk_count, created_at",
      [userId, originalname, mimetype, chunks.length]
    );
    const id = doc.rows[0].id;
    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        "INSERT INTO chunks (document_id, idx, page, content, embedding) VALUES ($1,$2,$3,$4,$5::vector)",
        [id, i, chunks[i].page, chunks[i].content, toVector(vectors[i])]
      );
    }
    await client.query("COMMIT");
    res.status(201).json(doc.rows[0]);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
});

router.get("/documents", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, filename, chunk_count, created_at FROM documents WHERE user_id = $1 ORDER BY id DESC",
    [req.userId]
  );
  res.json(rows);
});

router.delete("/documents/:id", validate(idParamSchema, "params"), async (req, res) => {
  await pool.query("DELETE FROM documents WHERE id = $1 AND user_id = $2", [Number(req.params.id), req.userId]);
  res.status(204).end();
});

router.post("/ask", askLimiter, validate(askSchema), async (req, res) => {
  const { question, documentId } = req.body as { question: string; documentId?: number | null };

  const [qVec] = await embed([question]);
  const { rows } = await pool.query(
    `SELECT c.content, c.page, c.document_id, d.filename,
            1 - (c.embedding <=> $1::vector) AS score
       FROM chunks c JOIN documents d ON d.id = c.document_id
      WHERE d.user_id = $3
        AND ($2::int IS NULL OR c.document_id = $2)
      ORDER BY c.embedding <=> $1::vector
      LIMIT 5`,
    [toVector(qVec), documentId ?? null, req.userId]
  );

  const minScore = Number(process.env.MIN_SCORE ?? 0.1);
  const relevant = rows.filter((r) => r.score >= minScore);
  const notFound = { answer: "I couldn't find that in your documents.", found: false, sources: [] };
  if (relevant.length === 0) return res.json(notFound);

  const passages: Passage[] = relevant.map((r, i) => ({ n: i + 1, filename: r.filename, page: r.page, content: r.content }));
  const text = await answer(question, passages);
  if (text.replace(/"/g, "").trim() === "NOT_FOUND") return res.json(notFound);

  const cited = new Set([...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  const sources = relevant
    .map((r, i) => ({
      n: i + 1,
      documentId: r.document_id,
      filename: r.filename,
      page: r.page,
      score: Number(Number(r.score).toFixed(3)),
      snippet: String(r.content).slice(0, 300),
    }))
    .filter((s) => cited.size === 0 || cited.has(s.n));
  res.json({ answer: text, found: true, sources });
});