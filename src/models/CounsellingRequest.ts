import { model, models, Schema, type InferSchemaType } from "mongoose";

const counsellingRequestSchema = new Schema(
  {
    parentName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    preferredTime: { type: String, default: "Any time", trim: true },
    status: { type: String, enum: ["received"], default: "received" },
  },
  { timestamps: true },
);

export type CounsellingRequestRecord = InferSchemaType<
  typeof counsellingRequestSchema
>;
export const CounsellingRequest =
  models.CounsellingRequest ||
  model("CounsellingRequest", counsellingRequestSchema);
