"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FolderIcon,
  File01Icon,
  Upload01Icon,
  Delete01Icon,
  MoreVerticalCircle01Icon,
  ArrowLeft01Icon,
  DownloadIcon,
  EyeIcon,
  FolderOpenIcon,
  ArrowRight01Icon,
  Edit01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface FileItem {
  name: string;
  type: "file" | "folder";
  size: number;
  modified: string;
  path: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

interface FileManagerProps {
  className?: string;
}

export function FileManager({ className }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showRenameDialog, setShowRenameDialog] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState<string | null>(null);
  const [moveDestinationPath, setMoveDestinationPath] = useState("");
  const [uploadProgress, setUploadProgress] = useState<
    Map<string, UploadProgress>
  >(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch files
  const { data, isLoading, error } = useQuery<{
    items: FileItem[];
    currentPath: string;
  }>({
    queryKey: ["files", currentPath],
    queryFn: async () => {
      const response = await fetch(
        `/api/files?path=${encodeURIComponent(currentPath)}`
      );
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
  });

  // Upload function with progress tracking
  const uploadFileWithProgress = async (
    file: File,
    path: string
  ): Promise<void> => {
    const fileId = `${file.name}-${Date.now()}`;

    // Initialize upload progress
    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      newMap.set(fileId, {
        file,
        progress: 0,
        status: "uploading",
      });
      return newMap;
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", path);

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(fileId);
            if (existing) {
              newMap.set(fileId, { ...existing, progress });
            }
            return newMap;
          });
        }
      });

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Mark as success
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(fileId);
            if (existing) {
              newMap.set(fileId, {
                ...existing,
                progress: 100,
                status: "success",
              });
            }
            return newMap;
          });

          // Remove from progress after 2 seconds
          setTimeout(() => {
            setUploadProgress((prev) => {
              const newMap = new Map(prev);
              newMap.delete(fileId);
              return newMap;
            });
          }, 2000);

          queryClient.invalidateQueries({ queryKey: ["files"] });
          resolve();
        } else {
          // Handle error response
          let errorMessage = "Failed to upload file";
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If response is not JSON, use status text
            errorMessage = xhr.statusText || errorMessage;
          }

          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(fileId);
            if (existing) {
              newMap.set(fileId, {
                ...existing,
                status: "error",
                error: errorMessage,
              });
            }
            return newMap;
          });

          reject(new Error(errorMessage));
        }
      });

      // Handle network errors
      xhr.addEventListener("error", () => {
        const errorMessage = "Network error. Please check your connection.";
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(fileId);
          if (existing) {
            newMap.set(fileId, {
              ...existing,
              status: "error",
              error: errorMessage,
            });
          }
          return newMap;
        });
        reject(new Error(errorMessage));
      });

      // Handle abort
      xhr.addEventListener("abort", () => {
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.delete(fileId);
          return newMap;
        });
        reject(new Error("Upload cancelled"));
      });

      xhr.open("POST", "/api/files");
      xhr.send(formData);
    });
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const response = await fetch(
        `/api/files?path=${encodeURIComponent(filePath)}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setSelectedItems(new Set());
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async ({ name, path }: { name: string; path: string }) => {
      const formData = new FormData();
      formData.append("action", "create-folder");
      formData.append("name", name);
      formData.append("path", path);
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to create folder");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setShowCreateFolder(false);
      setNewFolderName("");
    },
  });

  // Move mutation
  const moveMutation = useMutation({
    mutationFn: async ({
      sourcePath,
      destinationPath,
    }: {
      sourcePath: string;
      destinationPath: string;
    }) => {
      const response = await fetch("/api/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath,
          destinationPath,
          action: "move",
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to move");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setShowMoveDialog(null);
      setMoveDestinationPath("");
    },
    onError: (error: Error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({
      sourcePath,
      newName,
    }: {
      sourcePath: string;
      newName: string;
    }) => {
      const pathParts = sourcePath.split("/");
      pathParts[pathParts.length - 1] = newName;
      const destinationPath = pathParts.join("/");

      const response = await fetch("/api/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath,
          destinationPath,
          action: "rename",
        }),
      });
      if (!response.ok) throw new Error("Failed to rename");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setShowRenameDialog(null);
      setRenameValue("");
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Upload all files in parallel
      const uploadPromises = Array.from(files).map((file) =>
        uploadFileWithProgress(file, currentPath).catch((error) => {
          console.error(`Error uploading ${file.name}:`, error);
        })
      );
      await Promise.allSettled(uploadPromises);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = (item: FileItem) => {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      deleteMutation.mutate(item.path);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate({
        name: newFolderName.trim(),
        path: currentPath,
      });
    }
  };

  const handleRename = (item: FileItem) => {
    setRenameValue(item.name);
    setShowRenameDialog(item.path);
  };

  const handleRenameSubmit = () => {
    if (showRenameDialog && renameValue.trim()) {
      renameMutation.mutate({
        sourcePath: showRenameDialog,
        newName: renameValue.trim(),
      });
    }
  };

  const handleMove = (item: FileItem) => {
    setShowMoveDialog(item.path);
    setMoveDestinationPath("");
  };

  const handleMoveSubmit = () => {
    if (showMoveDialog) {
      const pathParts = showMoveDialog.split("/");
      const fileName = pathParts[pathParts.length - 1];

      // Construct destination path: if destination is provided, append filename to it
      // Otherwise, move to root
      const destinationPath = moveDestinationPath.trim()
        ? `${moveDestinationPath.trim()}/${fileName}`
        : fileName;

      moveMutation.mutate({
        sourcePath: showMoveDialog,
        destinationPath: destinationPath,
      });
    }
  };

  const handleDownload = async (item: FileItem) => {
    if (item.type === "file") {
      const response = await fetch(
        `/api/files/download?path=${encodeURIComponent(item.path)}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const handleView = async (item: FileItem) => {
    if (item.type === "file") {
      const response = await fetch(
        `/api/files/read?path=${encodeURIComponent(item.path)}`
      );
      const data = await response.json();

      if (data.type === "text") {
        const newWindow = window.open("", "_blank");
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>${data.name}</title></head>
              <body style="font-family: monospace; padding: 20px; white-space: pre-wrap;">${data.content}</body>
            </html>
          `);
        }
      } else if (data.type === "binary") {
        const blob = new Blob(
          [Uint8Array.from(atob(data.content), (c) => c.charCodeAt(0))],
          { type: data.mimeType }
        );
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    }
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
    setSelectedItems(new Set());
  };

  const navigateUp = () => {
    const pathParts = currentPath.split("/").filter(Boolean);
    pathParts.pop();
    setCurrentPath(pathParts.join("/"));
    setSelectedItems(new Set());
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pathParts = currentPath.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => ({
    name: part,
    path: pathParts.slice(0, index + 1).join("/"),
  }));

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={navigateUp}
          disabled={!currentPath}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
        </Button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            onClick={() => navigateToFolder("")}
            className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded"
          >
            Home
          </button>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1">
              <span className="text-muted-foreground">/</span>
              <button
                onClick={() => navigateToFolder(crumb.path)}
                className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateFolder(true)}
        >
          <HugeiconsIcon icon={FolderOpenIcon} className="h-4 w-4 mr-2" />
          New Folder
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <HugeiconsIcon icon={Upload01Icon} className="h-4 w-4 mr-2" />
          Upload
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Create Folder Dialog */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create New Folder</h3>
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") setShowCreateFolder(false);
                }}
                autoFocus
                className="mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateFolder(false);
                    setNewFolderName("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder}>Create</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Rename</h3>
              <Input
                placeholder="New name"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") setShowRenameDialog(null);
                }}
                autoFocus
                className="mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRenameDialog(null);
                    setRenameValue("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleRenameSubmit}>Rename</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Move Dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Move To</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Enter destination folder path (leave empty for root)
              </p>
              <Input
                placeholder="e.g., folder1/subfolder"
                value={moveDestinationPath}
                onChange={(e) => setMoveDestinationPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleMoveSubmit();
                  }
                  if (e.key === "Escape") {
                    setShowMoveDialog(null);
                    setMoveDestinationPath("");
                  }
                }}
                autoFocus
                className="mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMoveDialog(null);
                    setMoveDestinationPath("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleMoveSubmit}>Move</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.size > 0 && (
        <div className="border-b p-4 bg-muted/30 space-y-2">
          <h3 className="text-sm font-medium mb-2">Upload Progress</h3>
          {Array.from(uploadProgress.entries()).map(([fileId, progress]) => (
            <div key={fileId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <HugeiconsIcon
                    icon={File01Icon}
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                  <span className="truncate">{progress.file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatFileSize(progress.file.size)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {progress.status === "uploading" && (
                    <Badge variant="outline" className="text-xs">
                      {progress.progress}%
                    </Badge>
                  )}
                  {progress.status === "success" && (
                    <Badge className="bg-green-500 text-white">
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        className="h-3 w-3 mr-1"
                      />
                      Complete
                    </Badge>
                  )}
                  {progress.status === "error" && (
                    <Badge variant="destructive" className="text-xs">
                      <HugeiconsIcon
                        icon={AlertCircleIcon}
                        className="h-3 w-3 mr-1"
                      />
                      Error
                    </Badge>
                  )}
                </div>
              </div>
              {progress.status === "uploading" && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              )}
              {progress.status === "error" && progress.error && (
                <p className="text-xs text-destructive mt-1">
                  {progress.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="h-8 w-8 text-destructive mx-auto mb-2"
              />
              <p className="text-destructive font-medium">
                Error loading files
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred"}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.items.map((item) => (
              <Card
                key={item.path}
                className={cn(
                  "cursor-pointer hover:ring-2 hover:ring-primary transition-all",
                  selectedItems.has(item.path) && "ring-2 ring-primary"
                )}
                onClick={() => {
                  if (item.type === "folder") {
                    navigateToFolder(item.path);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedItems(new Set([item.path]));
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <HugeiconsIcon
                        icon={item.type === "folder" ? FolderIcon : File01Icon}
                        className={cn(
                          "h-8 w-8 shrink-0",
                          item.type === "folder"
                            ? "text-blue-500"
                            : "text-muted-foreground"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.type === "file"
                            ? formatFileSize(item.size)
                            : "Folder"}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon-xs">
                          <HugeiconsIcon
                            icon={MoreVerticalCircle01Icon}
                            className="h-4 w-4"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.type === "file" && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(item);
                              }}
                            >
                              <HugeiconsIcon
                                icon={EyeIcon}
                                className="h-4 w-4 mr-2"
                              />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(item);
                              }}
                            >
                              <HugeiconsIcon
                                icon={DownloadIcon}
                                className="h-4 w-4 mr-2"
                              />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(item);
                          }}
                        >
                          <HugeiconsIcon
                            icon={Edit01Icon}
                            className="h-4 w-4 mr-2"
                          />
                          Rename
                        </DropdownMenuItem>
                        {item.type === "file" && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(item);
                            }}
                          >
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              className="h-4 w-4 mr-2"
                            />
                            Move
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                        >
                          <HugeiconsIcon
                            icon={Delete01Icon}
                            className="h-4 w-4 mr-2"
                          />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDate(item.modified)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && !error && data && data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64">
            <HugeiconsIcon
              icon={FolderIcon}
              className="h-16 w-16 text-muted-foreground mb-4"
            />
            <p className="text-muted-foreground">This folder is empty</p>
          </div>
        )}
      </div>
    </div>
  );
}
