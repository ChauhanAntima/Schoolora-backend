import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { schools } from "./data/schools";
import { Application } from "./models/Application";
import { ContactMessage } from "./models/ContactMessage";
import { CounsellingRequest } from "./models/CounsellingRequest";

const app = express();

app.use(helmet());
const configuredFrontendOrigin =
  process.env.FRONTEND_URL || "http://localhost:3000";
app.use(
  cors({
    origin(origin, callback) {
      const isLocalDevelopmentOrigin =
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "");

      if (
        !origin ||
        origin === configuredFrontendOrigin ||
        isLocalDevelopmentOrigin
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "School Finder API is running",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/api/schools", (req, res) => {
  const { q, city, area, board, grade, type, minFee, maxFee, sort } = req.query;
  let results = schools.filter((school) => {
    return (
      (!city || school.city.toLowerCase() === String(city).toLowerCase()) &&
      (!area ||
        school.area.toLowerCase().includes(String(area).toLowerCase())) &&
      (!board || school.board.toLowerCase() === String(board).toLowerCase()) &&
      (!grade || school.classes.includes(String(grade))) &&
      (!type ||
        (String(type).toLowerCase() === "boarding"
          ? school.type === "Boarding School"
          : String(type).toLowerCase() === "online"
            ? school.type === "Online School"
            : school.type === "Day School")) &&
      (!minFee || school.annualFeeMax >= Number(minFee)) &&
      (!maxFee || school.annualFeeMin <= Number(maxFee))
    );
  });
  if (q) {
    const terms = String(q).toLowerCase().split(/\s+/).filter(Boolean);
    results = results.filter((school) => {
      const searchable =
        `${school.name} ${school.city} ${school.area} ${school.board} ${school.description} ${school.facilities.join(" ")}`.toLowerCase();
      return terms.some((term) => searchable.includes(term));
    });
  }
  if (sort === "fee-low")
    results = [...results].sort((a, b) => a.annualFeeMin - b.annualFeeMin);
  if (sort === "rating")
    results = [...results].sort((a, b) => b.rating - a.rating);
  res.json({ success: true, count: results.length, data: results });
});

app.get("/api/schools/:id", (req, res) => {
  const school = schools.find(
    (item) => item._id === req.params.id || item.slug === req.params.id,
  );
  if (!school)
    return res
      .status(404)
      .json({ success: false, message: "School not found" });
  return res.json({ success: true, data: school });
});

app.post("/api/counselling", async (req, res) => {
  const { parentName, phone, city, className, preferredTime } = req.body ?? {};
  if (
    !parentName ||
    !/^\+?[0-9\s-]{10,15}$/.test(String(phone ?? "")) ||
    !city ||
    !className
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Please provide a name, valid phone, city and class.",
      });
  }
  if (mongoose.connection.readyState !== 1) {
    return res
      .status(503)
      .json({
        success: false,
        message: "The database is unavailable. Please try again shortly.",
      });
  }
  try {
    const record = await CounsellingRequest.create({
      parentName,
      phone,
      city,
      className,
      preferredTime: preferredTime ?? "Any time",
    });
    return res.status(201).json({
      success: true,
      message: "Your counselling request has been received.",
      data: { id: record.id, status: record.status },
    });
  } catch {
    return res
      .status(500)
      .json({
        success: false,
        message: "We could not save your request. Please try again.",
      });
  }
});

app.post("/api/contact", async (req, res) => {
  const { name, email, topic, message } = req.body ?? {};
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? ""));
  if (
    !name ||
    !validEmail ||
    !topic ||
    String(message ?? "").trim().length < 10
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message:
          "Enter your name, valid email, topic and a message of at least 10 characters.",
      });
  }
  if (mongoose.connection.readyState !== 1) {
    return res
      .status(503)
      .json({
        success: false,
        message: "The database is unavailable. Please try again shortly.",
      });
  }
  try {
    const record = await ContactMessage.create({
      reference: `MSG-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`,
      name,
      email,
      topic,
      message: String(message).trim(),
    });
    return res.status(201).json({
      success: true,
      message: "Your message has been received.",
      data: { reference: record.reference, status: record.status },
    });
  } catch {
    return res
      .status(500)
      .json({
        success: false,
        message: "We could not save your message. Please try again.",
      });
  }
});

app.post("/api/compare", (req, res) => {
  const ids = Array.isArray(req.body?.schoolIds) ? req.body.schoolIds : [];
  if (ids.length < 2 || ids.length > 3)
    return res
      .status(400)
      .json({
        success: false,
        message: "Choose two or three schools to compare.",
      });
  const selected = ids
    .map((id: string) => schools.find((school) => school._id === id))
    .filter(Boolean);
  if (selected.length !== ids.length)
    return res
      .status(404)
      .json({
        success: false,
        message: "One or more schools could not be found.",
      });
  return res.json({ success: true, count: selected.length, data: selected });
});

app.post("/api/applications", async (req, res) => {
  const { parentName, phone, schoolId, childName, className } = req.body ?? {};
  const school = schools.find(
    (item) => item._id === schoolId || item.slug === schoolId,
  );
  if (
    !parentName ||
    !/^\+?[0-9\s-]{10,15}$/.test(String(phone ?? "")) ||
    !school ||
    !childName ||
    !className
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Please complete the application details.",
      });
  }
  if (mongoose.connection.readyState !== 1) {
    return res
      .status(503)
      .json({
        success: false,
        message: "The database is unavailable. Please try again shortly.",
      });
  }
  try {
    const record = await Application.create({
      reference: `ES-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`,
      kind: "single",
      parentName,
      phone,
      childName,
      className,
      schoolIds: [school._id],
      schoolNames: [school.name],
    });
    return res.status(201).json({
      success: true,
      message: "Your school enquiry has been received.",
      data: {
        id: record.id,
        reference: record.reference,
        status: record.status,
      },
    });
  } catch {
    return res
      .status(500)
      .json({
        success: false,
        message: "We could not save your enquiry. Please try again.",
      });
  }
});

app.post("/api/applications/bulk", async (req, res) => {
  const {
    parentName,
    phone,
    childName,
    className,
    email,
    address,
    dateOfBirth,
    session,
    schoolIds,
  } = req.body ?? {};
  const ids = Array.isArray(schoolIds) ? schoolIds : [];
  const selected = ids
    .map((id: string) => schools.find((school) => school._id === id))
    .filter(Boolean);
  if (
    !parentName ||
    !childName ||
    !className ||
    !email ||
    !address ||
    !/^\+?[0-9\s-]{10,15}$/.test(String(phone ?? ""))
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message:
          "Complete the child and parent details with a valid mobile number.",
      });
  }
  if (ids.length < 1 || ids.length > 5 || selected.length !== ids.length) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Select between one and five valid schools.",
      });
  }
  if (mongoose.connection.readyState !== 1) {
    return res
      .status(503)
      .json({
        success: false,
        message: "The database is unavailable. Please try again shortly.",
      });
  }
  try {
    const reference = `ES-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`;
    const record = await Application.create({
      reference,
      kind: "bulk",
      parentName,
      phone,
      childName,
      className,
      email,
      address,
      dateOfBirth,
      session,
      schoolIds: selected.map((school) => school!._id),
      schoolNames: selected.map((school) => school!.name),
    });
    return res.status(201).json({
      success: true,
      message: "Your application request has been received.",
      data: { reference: record.reference, status: record.status },
    });
  } catch {
    return res
      .status(500)
      .json({
        success: false,
        message: "We could not save your application. Please try again.",
      });
  }
});

import { connectDB } from "./config/db";

let dbConnectionPromise: Promise<void> | null = null;

app.use(async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (!dbConnectionPromise) {
        dbConnectionPromise = connectDB().catch((error) => {
          dbConnectionPromise = null;
          throw error;
        });
      }

      await dbConnectionPromise;
    }

    next();
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(503).json({
      success: false,
      message: "Database temporarily unavailable",
    });
  }
});

export default app;
