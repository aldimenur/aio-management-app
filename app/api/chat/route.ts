import { NextRequest, NextResponse } from "next/server";
import {
  readMessages,
  addMessage,
  clearMessages,
  type ChatMessage,
} from "@/lib/chat-storage";

export interface ChatMessageRequest {
  text: string;
  sender?: string;
}

// GET - Fetch all messages
export async function GET() {
  try {
    const messages = await readMessages();
    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    console.error("Error reading chat messages:", error);
    return NextResponse.json(
      { error: "Failed to read messages" },
      { status: 500 }
    );
  }
}

// POST - Add a new message
export async function POST(request: NextRequest) {
  try {
    const body: ChatMessageRequest = await request.json();
    const { text, sender } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Message text is required" },
        { status: 400 }
      );
    }

    const message: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: text.trim(),
      sender: sender || "You",
      timestamp: new Date().toISOString(),
    };

    await addMessage(message);

    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (error) {
    console.error("Error saving chat message:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }
}

// DELETE - Clear all messages
export async function DELETE() {
  try {
    await clearMessages();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error clearing chat messages:", error);
    return NextResponse.json(
      { error: "Failed to clear messages" },
      { status: 500 }
    );
  }
}

