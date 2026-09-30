import { integer, numeric, pgTable, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { invoicesTable } from "./invoices";

export const invoiceLinesTable = pgTable(
  "invoice_lines",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
    productReference: text("product_reference"),
    productDescription: text("product_description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
    unitHt: numeric("unit_ht", { precision: 12, scale: 3, mode: "number" }),
    discountPercent: numeric("discount_percent", { precision: 6, scale: 3, mode: "number" }).notNull().default(0),
    lineNetHt: numeric("line_net_ht", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
    vatRate: numeric("vat_rate", { precision: 6, scale: 3, mode: "number" }).notNull().default(19),
    lineTtc: numeric("line_ttc", { precision: 12, scale: 3, mode: "number" }).notNull().default(0),
    notes: text("notes"),
  },
  (table) => ({
    invoiceLineUnique: unique().on(table.invoiceId, table.lineNumber),
  }),
);

export const insertInvoiceLineSchema = createInsertSchema(invoiceLinesTable).omit({ id: true });
export type InvoiceLine = typeof invoiceLinesTable.$inferSelect;
export type InsertInvoiceLine = typeof invoiceLinesTable.$inferInsert;