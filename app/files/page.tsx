"use client";

import { FileManager } from "@/components/file-manager";
import { StorageOverview } from "@/components/storage-overview";

export default function FilesPage() {
  return (
    <div className="container mx-auto h-[calc(100vh-4rem)] py-4">
      <div className="flex items-start justify-between mb-4 px-4">
        <h1 className="text-3xl font-bold">File Management</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 px-4 h-[calc(100%-5rem)]">
        <div className="lg:col-span-1">
          <StorageOverview />
        </div>
        <div className="lg:col-span-3">
          <FileManager className="h-full" />
        </div>
      </div>
    </div>
  );
}
