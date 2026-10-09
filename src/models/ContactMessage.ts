import { model, models, Schema, type InferSchemaType } from "mongoose";

const contactMessageSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    topic: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["received"], default: "received" },
  },
  { timestamps: true },
);

export type ContactMessageRecord = InferSchemaType<typeof contactMessageSchema>;
export const ContactMessage =
  models.ContactMessage || model("ContactMessage", contactMessageSchema);
