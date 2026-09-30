import { integer, numeric, pgTable, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { invoicesTable } from "./invoices";
import { paymentsTable } from "./payments";

export const paymentAllocationsTable = pgTable("payment_allocations", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  paymentId: integer("payment_id").notNull().references(() => paymentsTable.id, { onDelete: "cascade" }),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
  amountAllocated: numeric("amount_allocated", { precision: 12, scale: 3, mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentAllocationSchema = createInsertSchema(paymentAllocationsTable).omit({ id: true, createdAt: true });
export type PaymentAllocation = typeof paymentAllocationsTable.$inferSelect;
export type InsertPaymentAllocation = typeof paymentAllocationsTable.$inferInsert;