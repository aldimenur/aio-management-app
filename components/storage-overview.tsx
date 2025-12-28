"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { DatabaseIcon } from "@hugeicons/core-free-icons";

interface StorageStats {
  used: number;
  total: number | null;
  free: number | null;
  available: number | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatPercentage(used: number, total: number | null): string {
  if (total === null || total === 0) return "N/A";
  const percentage = (used / total) * 100;
  return `${percentage.toFixed(1)}%`;
}

export function StorageOverview() {
  const { data, isLoading, error } = useQuery<StorageStats>({
    queryKey: ["storage-stats"],
    queryFn: async () => {
      const response = await fetch("/api/files/storage");
      if (!response.ok) throw new Error("Failed to fetch storage stats");
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={DatabaseIcon} className="h-5 w-5" />
            Storage Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={DatabaseIcon} className="h-5 w-5" />
            Storage Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load storage information
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { used, total, free, available } = data;
  const usedPercentage = total ? (used / total) * 100 : null;
  const freeSpace = free ?? available ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HugeiconsIcon icon={DatabaseIcon} className="h-5 w-5" />
          Storage Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Used Space */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Used Space</span>
            <span className="font-medium">{formatBytes(used)}</span>
          </div>
          {total && (
            <div className="text-xs text-muted-foreground">
              {formatPercentage(used, total)} of total
            </div>
          )}
        </div>

        {/* Free Space */}
        {freeSpace !== null && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Free Space</span>
              <span className="font-medium">{formatBytes(freeSpace)}</span>
            </div>
            {total && (
              <div className="text-xs text-muted-foreground">
                {formatPercentage(freeSpace, total)} available
              </div>
            )}
          </div>
        )}

        {/* Total Space */}
        {total !== null && (
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Total Space</span>
              <span className="font-medium">{formatBytes(total)}</span>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {usedPercentage !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Storage Usage</span>
              <span>{usedPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  usedPercentage > 90
                    ? "bg-destructive"
                    : usedPercentage > 75
                    ? "bg-orange-500"
                    : "bg-primary"
                }`}
                style={{ width: `${Math.min(usedPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Storage Used</span>
            <span className="font-semibold">
              {formatBytes(used)}
              {total && ` / ${formatBytes(total)}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

