"use client";

import { FileManager } from "@/components/file-manager";

export default function FilesPage() {
  return (
    <div className="container mx-auto h-[calc(100vh-4rem)] py-4">
      <h1 className="text-3xl font-bold mb-4 px-4">File Management</h1>
      <FileManager className="h-[calc(100%-4rem)]" />
    </div>
  );
}
