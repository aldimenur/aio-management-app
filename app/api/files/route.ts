import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "storage");

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// GET - List files and folders
export async function GET(request: NextRequest) {
  try {
    await ensureStorageDir();
    const searchParams = request.nextUrl.searchParams;
    const folderPath = searchParams.get("path") || "";

    const targetPath = path.join(UPLOAD_DIR, folderPath);

    // Security: Ensure path is within UPLOAD_DIR
    const resolvedPath = path.resolve(targetPath);
    if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    try {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });

      const items = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(targetPath, entry.name);
          const stats = await fs.stat(fullPath);

          return {
            name: entry.name,
            type: entry.isDirectory() ? "folder" : "file",
            size: stats.size,
            modified: stats.mtime.toISOString(),
            path: path.join(folderPath, entry.name).replace(/\\/g, "/"),
          };
        })
      );

      return NextResponse.json({ items, currentPath: folderPath });
    } catch (error) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}

// POST - Upload file or create folder
export async function POST(request: NextRequest) {
  try {
    await ensureStorageDir();
    const formData = await request.formData();
    const action = formData.get("action") as string;

    if (action === "create-folder") {
      const folderName = formData.get("name") as string;
      const folderPath = (formData.get("path") as string) || "";

      if (!folderName) {
        return NextResponse.json(
          { error: "Folder name required" },
          { status: 400 }
        );
      }

      const targetPath = path.join(UPLOAD_DIR, folderPath, folderName);
      const resolvedPath = path.resolve(targetPath);

      if (!resolvedPath.startsWith(path.resolve(UPLOAD_DIR))) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }

      await fs.mkdir(targetPath, { recursive: true });
      return NextResponse.json({ success: true, message: "Folder created" });
    }

    // Upload file
    const file = formData.get("file") as File;
    const uploadPath = (formData.get("path") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const targetDir = path.join(UPLOAD_DIR, uploadPath);
    const resolvedDir = path.resolve(targetDir);

    if (!resolvedDir.startsWith(path.resolve(UPLOAD_DIR))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    await fs.mkdir(targetDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(targetDir, file.name);

    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ success: true, message: "File uploaded" });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// DELETE - Delete file or folder
export async function DELETE(request: NextRequest) {
  try {
    await ensureStorageDir();
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
      await fs.rmdir(targetPath, { recursive: true });
    } else {
      await fs.unlink(targetPath);
    }

    return NextResponse.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

// PATCH - Move/rename file or folder
export async function PATCH(request: NextRequest) {
  try {
    await ensureStorageDir();
    const body = await request.json();
    const { sourcePath, destinationPath, action } = body;

    if (!sourcePath || !destinationPath) {
      return NextResponse.json(
        { error: "Source and destination paths required" },
        { status: 400 }
      );
    }

    const source = path.join(UPLOAD_DIR, sourcePath);
    const destination = path.join(UPLOAD_DIR, destinationPath);

    const resolvedSource = path.resolve(source);
    const resolvedDest = path.resolve(destination);

    if (
      !resolvedSource.startsWith(path.resolve(UPLOAD_DIR)) ||
      !resolvedDest.startsWith(path.resolve(UPLOAD_DIR))
    ) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    if (action === "move") {
      // Check if source exists
      try {
        await fs.access(source);
      } catch {
        return NextResponse.json({ error: "Source file not found" }, { status: 404 });
      }

      // Check if destination already exists
      try {
        await fs.access(destination);
        return NextResponse.json(
          { error: "Destination already exists" },
          { status: 400 }
        );
      } catch {
        // Destination doesn't exist, which is good
      }

      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      const resolvedDestDir = path.resolve(destDir);
      const resolvedUploadDir = path.resolve(UPLOAD_DIR);
      if (resolvedDestDir !== resolvedUploadDir) {
        await fs.mkdir(destDir, { recursive: true });
      }
      
      await fs.rename(source, destination);
    } else if (action === "rename") {
      // Check if source exists
      try {
        await fs.access(source);
      } catch {
        return NextResponse.json({ error: "Source file not found" }, { status: 404 });
      }

      // Check if destination already exists
      try {
        await fs.access(destination);
        return NextResponse.json(
          { error: "A file with that name already exists" },
          { status: 400 }
        );
      } catch {
        // Destination doesn't exist, which is good
      }

      await fs.rename(source, destination);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Operation successful",
    });
  } catch (error) {
    console.error("Error moving/renaming file:", error);
    return NextResponse.json(
      { error: "Failed to move/rename file" },
      { status: 500 }
    );
  }
}
