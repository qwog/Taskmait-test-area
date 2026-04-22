import { z } from "zod";

export const leadSchema = z.object({
  companyNameRaw: z.string().min(2),
  contactNameRaw: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).optional(),
  status: z.enum(["NEW", "ATTEMPTING_CONTACT", "CONTACTED", "QUALIFIED", "UNQUALIFIED", "CONVERTED", "LOST"])
});

export const adSaleSchema = z
  .object({
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    discountAmount: z.number().nonnegative().default(0)
  })
  .refine((v) => v.quantity * v.unitPrice - v.discountAmount >= 0, {
    message: "Final price cannot be negative",
    path: ["discountAmount"]
  });
