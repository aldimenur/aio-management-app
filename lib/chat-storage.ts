import { promises as fs } from "fs";
import path from "path";

const CHAT_FILE_PATH = path.join(process.cwd(), process.env.CHAT_DIR as string, "chat.json");

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: string; // ISO string for serialization
}

// Ensure storage directory exists
async function ensureStorageDir() {
  const storageDir = path.dirname(CHAT_FILE_PATH);
  try {
    await fs.access(storageDir);
  } catch {
    await fs.mkdir(storageDir, { recursive: true });
  }
}

// Read messages from file
export async function readMessages(): Promise<ChatMessage[]> {
  try {
    await ensureStorageDir();
    const data = await fs.readFile(CHAT_FILE_PATH, "utf-8");
    const messages: ChatMessage[] = JSON.parse(data);
    return messages;
  } catch (error: any) {
    // If file doesn't exist, return empty array
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

// Write messages to file
export async function writeMessages(messages: ChatMessage[]): Promise<void> {
  await ensureStorageDir();
  await fs.writeFile(CHAT_FILE_PATH, JSON.stringify(messages, null, 2), "utf-8");
}

// Add a single message to the file
export async function addMessage(message: ChatMessage): Promise<void> {
  const messages = await readMessages();
  messages.push(message);
  await writeMessages(messages);
}

// Clear all messages
export async function clearMessages(): Promise<void> {
  await writeMessages([]);
}

