import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserNamespace, upsertToNamespace, textToVector } from "@/lib/pinecone";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;

    // Extract text content based on file type
    let textContent = "";

    if (fileType === "application/pdf") {
      // PDF extraction
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const pdfData = await pdfParse(buffer);
        textContent = pdfData.text;
      } catch {
        textContent = `[PDF file: ${fileName}, ${fileSize} bytes - text extraction failed]`;
      }
    } else if (
      fileType === "text/plain" ||
      fileType === "text/csv" ||
      fileType === "text/markdown" ||
      fileType === "application/json" ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".json") ||
      fileName.endsWith(".xml") ||
      fileName.endsWith(".html") ||
      fileName.endsWith(".yml") ||
      fileName.endsWith(".yaml")
    ) {
      // Text-based files
      textContent = await file.text();
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      // DOCX - extract raw text from XML
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const text = buffer.toString("utf-8");
      // Basic XML text extraction
      textContent = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (textContent.length < 50) {
        textContent = `[DOCX file: ${fileName}, ${fileSize} bytes]`;
      }
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls")
    ) {
      textContent = `[Spreadsheet file: ${fileName}, ${fileSize} bytes]`;
    } else if (fileType.startsWith("image/")) {
      textContent = `[Image file: ${fileName}, type: ${fileType}, ${fileSize} bytes]`;
    } else {
      // Try to read as text
      try {
        textContent = await file.text();
        if (textContent.length < 10 || /[\x00-\x08\x0E-\x1F]/.test(textContent.substring(0, 100))) {
          textContent = `[Binary file: ${fileName}, type: ${fileType}, ${fileSize} bytes]`;
        }
      } catch {
        textContent = `[File: ${fileName}, type: ${fileType}, ${fileSize} bytes]`;
      }
    }

    // Truncate if too long
    const maxLength = 10000;
    if (textContent.length > maxLength) {
      textContent = textContent.substring(0, maxLength) + "\n...[truncated]";
    }

    // Store in Pinecone for memory
    try {
      const namespace = getUserNamespace(userId);
      const vector = textToVector(textContent);
      const docId = uuidv4();

      await upsertToNamespace(namespace, [{
        id: docId,
        values: vector,
        metadata: {
          content: textContent.substring(0, 2000),
          type: "document",
          fileName,
          fileType,
          timestamp: new Date().toISOString(),
        },
      }]);
    } catch {
      // Pinecone may not be configured - continue without storage
    }

    return NextResponse.json({
      success: true,
      fileName,
      fileType,
      fileSize,
      textContent: textContent.substring(0, 5000),
      extracted: textContent.length > 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `File processing failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
