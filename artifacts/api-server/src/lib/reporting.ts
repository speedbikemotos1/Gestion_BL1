import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  invoiceLinesTable,
  invoicesTable,
  paymentAllocationsTable,
  paymentsTable,
} from "@workspace/db";
import { getDatasetTotals, validationWarnings } from "./importer";
import { getSupplierCredit } from "./financial";

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

export async function getDashboard(executor: any = db) {
  const totals = await getDatasetTotals(executor);
  const [paid] = await executor
    .select({ value: sql<number>`coalesce(sum(${paymentAllocationsTable.amountAllocated}), 0)` })
    .from(paymentAllocationsTable);
  const [remaining] = await executor
    .select({ value: sql<number>`coalesce(sum(${invoicesTable.amountRemaining}), 0)` })
    .from(invoicesTable)
    .where(eq(invoicesTable.documentType, "BON DE LIVRAISON"));
  const [statusCounts] = await executor
    .select({
      paid: sql<number>`count(*) filter (where ${invoicesTable.paymentStatus} = 'PAID')`,
      partlyPaid: sql<number>`count(*) filter (where ${invoicesTable.paymentStatus} = 'PARTLY_PAID')`,
      unpaid: sql<number>`count(*) filter (where ${invoicesTable.paymentStatus} = 'UNPAID')`,
      afterSales: sql<number>`count(*) filter (where ${invoicesTable.paymentStatus} = 'AFTER_SALES')`,
      unspecified: sql<number>`count(*) filter (where ${invoicesTable.paymentStatus} = 'UNSPECIFIED')`,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.documentType, "BON DE LIVRAISON"));
  return {
    invoiceCount: totals.invoiceCount,
    totalTtc: totals.totalTtc,
    totalPaid: roundMoney(Number(paid.value)),
    remaining: roundMoney(Number(remaining.value)),
    supplierCredit: await getSupplierCredit(executor),
    totalHt: totals.totalHt,
    totalVat: totals.totalVat,
    fiscalStamp: totals.fiscalStamp,
    totalUnits: totals.totalUnits,
    productLineCount: totals.lineCount,
    counts: {
      paid: Number(statusCounts.paid),
      partlyPaid: Number(statusCounts.partlyPaid),
      unpaid: Number(statusCounts.unpaid),
      afterSales: Number(statusCounts.afterSales),
      unspecified: Number(statusCounts.unspecified),
    },
    validation: {
      expectedInvoiceCount: 17,
      expectedLineCount: 93,
      expectedTotalUnits: 672,
      expectedTotalHt: 17813.104,
      expectedTotalVat: 3384.489,
      expectedFiscalStamp: 1,
      expectedTotalTtc: 21198.593,
      warnings: validationWarnings(totals),
    },
  };
}

export async function getInvoiceDetail(id: number, executor: any = db) {
  const [invoice] = await executor.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice) return null;
  const lines = await executor
    .select()
    .from(invoiceLinesTable)
    .where(eq(invoiceLinesTable.invoiceId, id))
    .orderBy(asc(invoiceLinesTable.lineNumber));
  const allocations = await executor
    .select({
      id: paymentAllocationsTable.id,
      paymentId: paymentAllocationsTable.paymentId,
      invoiceId: paymentAllocationsTable.invoiceId,
      invoiceNumber: invoicesTable.invoiceNumber,
      amountAllocated: paymentAllocationsTable.amountAllocated,
      paymentDate: paymentsTable.paymentDate,
      paymentReference: paymentsTable.reference,
    })
    .from(paymentAllocationsTable)
    .innerJoin(paymentsTable, eq(paymentsTable.id, paymentAllocationsTable.paymentId))
    .innerJoin(invoicesTable, eq(invoicesTable.id, paymentAllocationsTable.invoiceId))
    .where(eq(paymentAllocationsTable.invoiceId, id))
    .orderBy(desc(paymentsTable.paymentDate), desc(paymentsTable.id));
  return { ...invoice, lines, allocations };
}

export async function getPaymentView(id: number, executor: any = db) {
  const [payment] = await executor.select().from(paymentsTable).where(eq(paymentsTable.id, id));
  if (!payment) return null;
  const allocations = await executor
    .select({
      id: paymentAllocationsTable.id,
      paymentId: paymentAllocationsTable.paymentId,
      invoiceId: paymentAllocationsTable.invoiceId,
      invoiceNumber: invoicesTable.invoiceNumber,
      amountAllocated: paymentAllocationsTable.amountAllocated,
      paymentDate: paymentsTable.paymentDate,
      paymentReference: paymentsTable.reference,
    })
    .from(paymentAllocationsTable)
    .innerJoin(paymentsTable, eq(paymentsTable.id, paymentAllocationsTable.paymentId))
    .innerJoin(invoicesTable, eq(invoicesTable.id, paymentAllocationsTable.invoiceId))
    .where(eq(paymentAllocationsTable.paymentId, id))
    .orderBy(asc(paymentAllocationsTable.id));
  const allocatedAmount = roundMoney(allocations.reduce((sum: number, allocation: { amountAllocated: number }) => sum + allocation.amountAllocated, 0));
  return { ...payment, allocatedAmount, creditRemaining: roundMoney(payment.amount - allocatedAmount), allocations };
}

export function invoiceSearch(search: string | undefined) {
  if (!search?.trim()) return undefined;
  const value = `%${search.trim()}%`;
  return or(
    ilike(invoicesTable.invoiceNumber, value),
    ilike(invoicesTable.supplier, value),
    ilike(invoicesTable.customer, value),
  );
}