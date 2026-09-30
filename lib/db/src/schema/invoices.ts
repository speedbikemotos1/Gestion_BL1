import { date, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const invoicesTable = pgTable("invoices", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  invoiceDate: date("invoice_date", { mode: "string" }).notNull(),
  supplier: text("supplier").notNull(),
  customer: text("customer").notNull(),
  documentType: text("document_type").notNull(),
  totalHt: numeric("total_ht", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
  totalVat: numeric("total_vat", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
  fiscalStamp: numeric("fiscal_stamp", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
  totalTtc: numeric("total_ttc", { precision: 12, scale: 3, mode: "number" }).notNull(),
  sourcePaymentStatus: text("source_payment_status"),
  paymentStatus: text("payment_status").notNull().default("UNPAID"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
  amountRemaining: numeric("amount_remaining", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
  settlementType: text("settlement_type").notNull().default("NONE"),
  settlementComment: text("settlement_comment"),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertInvoice = typeof invoicesTable.$inferInsert;