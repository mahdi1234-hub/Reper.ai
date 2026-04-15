/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserNamespace, upsertToNamespace, textToVector } from "@/lib/pinecone";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60;

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
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    let textContent = "";

    // === PDF ===
    if (fileType === "application/pdf" || ext === "pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfParse = require("pdf-parse");
        const pdfData = await pdfParse(buffer);
        textContent = pdfData.text || "";
      } catch (e: any) {
        textContent = `[PDF file: ${fileName} - extraction error: ${e?.message || "unknown"}]`;
      }
    }
    // === DOCX ===
    else if (ext === "docx" || fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value || "";
      } catch (e: any) {
        textContent = `[DOCX file: ${fileName} - extraction error: ${e?.message || "unknown"}]`;
      }
    }
    // === Excel (XLSX, XLS) ===
    else if (ext === "xlsx" || ext === "xls" || ext === "csv" ||
      fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileType === "application/vnd.ms-excel") {
      try {
        if (ext === "csv") {
          textContent = await file.text();
        } else {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const XLSX = require("xlsx");
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const sheets: string[] = [];
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            sheets.push(`--- Sheet: ${sheetName} ---\n${csv}`);
          }
          textContent = sheets.join("\n\n");
        }
      } catch (e: any) {
        textContent = `[Spreadsheet: ${fileName} - extraction error: ${e?.message || "unknown"}]`;
      }
    }
    // === Plain text files ===
    else if (
      fileType.startsWith("text/") ||
      ext === "txt" || ext === "md" || ext === "json" || ext === "xml" ||
      ext === "html" || ext === "htm" || ext === "yml" || ext === "yaml" ||
      ext === "css" || ext === "js" || ext === "ts" || ext === "tsx" ||
      ext === "jsx" || ext === "py" || ext === "rb" || ext === "go" ||
      ext === "java" || ext === "c" || ext === "cpp" || ext === "h" ||
      ext === "rs" || ext === "php" || ext === "sql" || ext === "sh" ||
      ext === "bat" || ext === "env" || ext === "log" || ext === "ini" ||
      ext === "toml" || ext === "cfg" || ext === "conf" || ext === "rtf" ||
      ext === "svg" || ext === "graphql" || ext === "proto"
    ) {
      try {
        textContent = await file.text();
      } catch {
        textContent = `[Text file: ${fileName} - could not read]`;
      }
    }
    // === Images ===
    else if (fileType.startsWith("image/")) {
      textContent = `[Image file: ${fileName}, type: ${fileType}, size: ${fileSize} bytes. Image content analysis is not available in text mode.]`;
    }
    // === DOC (old Word) ===
    else if (ext === "doc") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Basic text extraction from DOC
        const text = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
        textContent = text.length > 50 ? text : `[DOC file: ${fileName} - binary format, limited text extraction]`;
      } catch {
        textContent = `[DOC file: ${fileName} - could not extract text]`;
      }
    }
    // === PowerPoint (PPTX) ===
    else if (ext === "pptx" || fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Basic extraction via raw XML parsing
        const text = buffer.toString("utf-8");
        const extracted = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        textContent = extracted.length > 50 ? extracted.substring(0, 10000) : `[PPTX file: ${fileName}]`;
      } catch {
        textContent = `[PPTX file: ${fileName} - could not extract text]`;
      }
    }
    // === Any other file ===
    else {
      try {
        const text = await file.text();
        // Check if it's actually readable text
        if (text.length > 10 && !/[\x00-\x08\x0E-\x1F]/.test(text.substring(0, 200))) {
          textContent = text;
        } else {
          textContent = `[Binary file: ${fileName}, type: ${fileType || "unknown"}, size: ${fileSize} bytes]`;
        }
      } catch {
        textContent = `[File: ${fileName}, type: ${fileType || "unknown"}, size: ${fileSize} bytes - could not read content]`;
      }
    }

    // Truncate if too long (LLM context limit)
    const maxLength = 8000;
    if (textContent.length > maxLength) {
      textContent = textContent.substring(0, maxLength) + "\n...[content truncated at 8000 characters]";
    }

    // Store in Pinecone for memory
    try {
      const namespace = getUserNamespace(userId);
      const vector = textToVector(textContent);
      await upsertToNamespace(namespace, [{
        id: uuidv4(),
        values: vector,
        metadata: {
          content: textContent.substring(0, 2000),
          type: "document",
          fileName,
          fileType: fileType || ext,
          timestamp: new Date().toISOString(),
        },
      }]);
    } catch {
      // Pinecone may not be configured
    }

    return NextResponse.json({
      success: true,
      fileName,
      fileType,
      fileSize,
      textContent,
      extracted: textContent.length > 0 && !textContent.startsWith("["),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `File processing failed: ${error?.message || "unknown error"}` },
      { status: 500 }
    );
  }
}
