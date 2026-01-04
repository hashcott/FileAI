import mongoose, { Schema, Document } from "mongoose";

export interface IMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    documentId: string;
    filename: string;
    content: string;
    score: number;
  }>;
  timestamp: Date;
}

export interface IChatHistory extends Document {
  userId: string;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  sources: [
    {
      documentId: String,
      filename: String,
      content: String,
      score: Number,
    },
  ],
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ChatHistorySchema = new Schema<IChatHistory>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    messages: [MessageSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
ChatHistorySchema.index({ userId: 1, createdAt: -1 });

export const ChatHistory = mongoose.model<IChatHistory>(
  "ChatHistory",
  ChatHistorySchema
);

