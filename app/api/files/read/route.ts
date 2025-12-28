import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), process.env.DATA_DIR as string);
if (!UPLOAD_DIR) {
  throw new Error("UPLOAD_DIR is not set");
}

// GET - Read file content
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    const targetPath = path.join(UPLOAD_DIR, filePath);
    const resolvedPath = path.resolve(targetPath);

    if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      return NextResponse.json(
        { error: "Cannot read directory" },
        { status: 400 }
      );
    }

    // For text files, return content
    // For binary files, return base64 or download
    const ext = path.extname(filePath).toLowerCase();
    const textExtensions = [
      ".txt",
      ".json",
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".css",
      ".html",
      ".md",
      ".xml",
      ".csv",
      ".log",
    ];

    if (textExtensions.includes(ext)) {
      const content = await fs.readFile(targetPath, "utf-8");
      return NextResponse.json({
        content,
        type: "text",
        name: path.basename(filePath),
        size: stats.size,
      });
    } else {
      // For binary files, return as base64
      const buffer = await fs.readFile(targetPath);
      const base64 = buffer.toString("base64");
      return NextResponse.json({
        content: base64,
        type: "binary",
        name: path.basename(filePath),
        size: stats.size,
        mimeType: getMimeType(ext),
      });
    }
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
  };
  return mimeTypes[ext] || "application/octet-stream";
}
