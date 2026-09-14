import { z } from "zod";
import {
  StaffRole,
  Priority,
} from "@/lib/generated/prisma/client";

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

const isValidDateKey = (val: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const d = new Date(`${val}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime());
};

export const createWorkOrderSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title must be at most 200 characters"),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description must be at most 2000 characters"),
    requiredStaffRole: z.nativeEnum(StaffRole),
    priority: z.nativeEnum(Priority),
    scheduledDate: z
      .string()
      .refine(isValidDateKey, { message: "Scheduled date must be a valid date" })
      .refine(
        (val) => {
          const d = new Date(`${val}T00:00:00.000Z`);
          const today = new Date();
          const todayUTC = new Date(
            Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
          );
          return d >= todayUTC;
        },
        { message: "Date must be today or a future date" },
      ),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:MM"),
    assignedToId: z
      .string("Please select a staff member")
      .uuid("Invalid staff id"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

export const suitableStaffSchema = z.object({
  requiredStaffRole: z.nativeEnum(StaffRole),
  scheduledDate: z.string().refine(isValidDateKey, { message: "Invalid date" }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export type SuitableStaffInput = z.infer<typeof suitableStaffSchema>;

export const remarkSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Remark is required")
    .max(1000, "Remark must be at most 1000 characters"),
});

export type RemarkInput = z.infer<typeof remarkSchema>;