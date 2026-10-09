import { model, models, Schema, type InferSchemaType } from "mongoose";

const applicationSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    kind: { type: String, enum: ["single", "bulk"], required: true },
    parentName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    childName: { type: String, required: true, trim: true },
    dateOfBirth: { type: String, trim: true },
    className: { type: String, required: true, trim: true },
    session: { type: String, trim: true },
    schoolIds: { type: [String], required: true },
    schoolNames: { type: [String], required: true },
    status: { type: String, enum: ["received"], default: "received" },
  },
  { timestamps: true },
);

export type ApplicationRecord = InferSchemaType<typeof applicationSchema>;
export const Application =
  models.Application || model("Application", applicationSchema);
