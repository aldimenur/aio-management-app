import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const UPLOAD_DIR = path.join(process.cwd(), "storage");

// Recursively calculate directory size
async function calculateDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        totalSize += await calculateDirectorySize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Ignore errors for inaccessible directories
    console.error(`Error calculating size for ${dirPath}:`, error);
  }
  
  return totalSize;
}

// Get disk space information using system commands
async function getDiskSpace(dirPath: string) {
  try {
    const platform = process.platform;
    const escapedPath = dirPath.replace(/"/g, '\\"');
    
    if (platform === "win32") {
      // Extract drive letter from path
      const driveMatch = dirPath.match(/^([A-Za-z]):/);
      const driveLetter = driveMatch ? driveMatch[1].toUpperCase() : null;
      
      if (!driveLetter) {
        // If we can't extract drive letter, try to get it from the resolved path
        const resolvedPath = path.resolve(dirPath);
        const resolvedDriveMatch = resolvedPath.match(/^([A-Za-z]):/);
        const resolvedDrive = resolvedDriveMatch ? resolvedDriveMatch[1].toUpperCase() : null;
        
        if (!resolvedDrive) {
          return null;
        }
        
        // Use resolved drive
        try {
          const wmicCommand = `wmic logicaldisk where "DeviceID='${resolvedDrive}:'" get Size,FreeSpace /format:value`;
          const { stdout: wmicOutput } = await execAsync(wmicCommand, { timeout: 5000 });
          
          const sizeMatch = wmicOutput.match(/Size=(\d+)/i);
          const freeMatch = wmicOutput.match(/FreeSpace=(\d+)/i);
          
          if (sizeMatch && freeMatch) {
            const total = parseInt(sizeMatch[1], 10);
            const free = parseInt(freeMatch[1], 10);
            return {
              total,
              free,
              available: free,
            };
          }
        } catch (error) {
          // Fall through to fsutil
        }
      } else {
        // Windows: use wmic for better compatibility
        try {
          // Try wmic first (more reliable and gets total space)
          const wmicCommand = `wmic logicaldisk where "DeviceID='${driveLetter}:'" get Size,FreeSpace /format:value`;
          const { stdout: wmicOutput } = await execAsync(wmicCommand, { timeout: 5000 });
          
          const sizeMatch = wmicOutput.match(/Size=(\d+)/i);
          const freeMatch = wmicOutput.match(/FreeSpace=(\d+)/i);
          
          if (sizeMatch && freeMatch) {
            const total = parseInt(sizeMatch[1], 10);
            const free = parseInt(freeMatch[1], 10);
            return {
              total,
              free,
              available: free,
            };
          }
        } catch (wmicError) {
          // Fall back to fsutil if wmic fails
        }
      }
      
      // Fall back to fsutil if wmic failed or drive letter not found
      try {
        const fsutilCommand = `fsutil volume diskfree "${dirPath}"`;
        const { stdout: fsutilOutput } = await execAsync(fsutilCommand, { timeout: 5000 });
        
        // Parse fsutil output: "Total free bytes: X" and "Total bytes: Y"
        const freeMatch = fsutilOutput.match(/Total free bytes\s*:\s*(\d+)/i);
        const totalMatch = fsutilOutput.match(/Total bytes\s*:\s*(\d+)/i);
        
        if (freeMatch) {
          const free = parseInt(freeMatch[1], 10);
          const total = totalMatch ? parseInt(totalMatch[1], 10) : null;
          return {
            total,
            free,
            available: free,
          };
        }
      } catch (fsutilError) {
        console.error("Both wmic and fsutil failed:", fsutilError);
      }
    } else {
      // Unix-like: use df with better parsing
      try {
        // Use df -B1 to get bytes directly, more reliable
        const command = `df -B1 "${escapedPath}" 2>/dev/null | tail -n +2`;
        const { stdout } = await execAsync(command, { timeout: 5000 });
        
        // df output format: Filesystem 1K-blocks Used Available Use% Mounted on
        // With -B1: Filesystem 1B-blocks Used Available Use% Mounted on
        const lines = stdout.trim().split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 0) {
          // Get the last line (most relevant mount point)
          const lastLine = lines[lines.length - 1].trim();
          const parts = lastLine.split(/\s+/).filter(part => part.length > 0);
          
          // Format: filesystem total used available use% mountpoint
          // Index:   0          1      2    3         4    5
          if (parts.length >= 4) {
            // Try parsing with -B1 (bytes)
            const totalValue = parseInt(parts[1], 10);
            const availableValue = parseInt(parts[3], 10);
            
            // Validate parsed values
            if (!isNaN(totalValue) && !isNaN(availableValue) && totalValue > 0 && availableValue >= 0) {
              // With -B1, values should already be in bytes
              // But some systems might not support -B1, so check magnitude
              // If values are suspiciously small (< 1GB), they might be in KB
              let total: number;
              let available: number;
              
              // If total is less than 1GB, it's likely in KB (some df versions don't support -B1)
              if (totalValue < 1073741824) {
                // Convert from KB to bytes
                total = totalValue * 1024;
                available = availableValue * 1024;
              } else {
                // Already in bytes
                total = totalValue;
                available = availableValue;
              }
              
              // Final validation: ensure values make sense
              if (total > 0 && available >= 0 && available <= total) {
                return {
                  total,
                  available,
                  free: available,
                };
              }
            }
          }
        }
      } catch (dfError) {
        // Fallback: try without -B1 flag (more compatible)
        try {
          const command = `df -k "${escapedPath}" 2>/dev/null | tail -n +2`;
          const { stdout } = await execAsync(command, { timeout: 5000 });
          
          const lines = stdout.trim().split('\n').filter(line => line.trim().length > 0);
          if (lines.length > 0) {
            const lastLine = lines[lines.length - 1].trim();
            const parts = lastLine.split(/\s+/).filter(part => part.length > 0);
            
            if (parts.length >= 4) {
              const totalValue = parseInt(parts[1], 10);
              const availableValue = parseInt(parts[3], 10);
              
              // Validate parsed values
              if (!isNaN(totalValue) && !isNaN(availableValue) && totalValue > 0 && availableValue >= 0) {
                const total = totalValue * 1024; // Convert KB to bytes
                const available = availableValue * 1024;
                
                // Final validation
                if (total > 0 && available >= 0 && available <= total) {
                  return {
                    total,
                    available,
                    free: available,
                  };
                }
              }
            }
          }
        } catch (fallbackError) {
          console.error("df command failed:", fallbackError);
        }
      }
    }
    
    return null;
  } catch (error) {
    // If command fails, return null - we'll still show used space
    console.error("Error getting disk space:", error);
    return null;
  }
}

// GET - Get storage statistics
export async function GET(request: NextRequest) {
  try {
    // Ensure storage directory exists
    try {
      await fs.access(UPLOAD_DIR);
    } catch {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Calculate used space
    const usedSpace = await calculateDirectorySize(UPLOAD_DIR);

    // Try to get disk space information
    const diskSpace = await getDiskSpace(UPLOAD_DIR);

    return NextResponse.json({
      used: usedSpace,
      total: diskSpace?.total ?? null,
      free: diskSpace?.free ?? null,
      available: diskSpace?.available ?? null,
    });
  } catch (error) {
    console.error("Error getting storage statistics:", error);
    return NextResponse.json(
      { error: "Failed to get storage statistics" },
      { status: 500 }
    );
  }
}

