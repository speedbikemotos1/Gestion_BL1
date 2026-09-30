import { and, asc, eq, ne } from "drizzle-orm";
import { db, invoicesTable, paymentAllocationsTable, paymentsTable } from "@workspace/db";

type Tx = any;

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

function invoiceStatus(invoice: { sourcePaymentStatus: string | null; settlementType: string; amountPaid: number; totalTtc: number }) {
  if (invoice.settlementType === "AFTER_SALES") return "AFTER_SALES";
  if (invoice.amountPaid >= invoice.totalTtc - 0.0005) return "PAID";
  if (invoice.amountPaid > 0) return "PARTLY_PAID";
  if (invoice.sourcePaymentStatus === "UNSPECIFIED" || invoice.sourcePaymentStatus === "PAID_EVIDENCE") {
    return "UNSPECIFIED";
  }
  return "UNPAID";
}

export async function recalculateFinancials(tx: Tx = db): Promise<number> {
  await tx.delete(paymentAllocationsTable);

  const invoices = await tx
    .select()
    .from(invoicesTable)
    .where(ne(invoicesTable.documentType, "FACTURE"))
    .orderBy(asc(invoicesTable.invoiceDate), asc(invoicesTable.id));
  const payments = await tx
    .select()
    .from(paymentsTable)
    .orderBy(asc(paymentsTable.paymentDate), asc(paymentsTable.id));

  const outstanding = new Map<number, number>();
  for (const invoice of invoices) {
    const remaining = invoice.settlementType === "AFTER_SALES" ? 0 : roundMoney(invoice.totalTtc);
    outstanding.set(invoice.id, remaining);
    await tx
      .update(invoicesTable)
      .set({
        amountPaid: 0,
        amountRemaining: remaining,
        paymentStatus: invoice.settlementType === "AFTER_SALES" ? "AFTER_SALES" : invoiceStatus({
          sourcePaymentStatus: invoice.sourcePaymentStatus,
          settlementType: invoice.settlementType,
          amountPaid: 0,
          totalTtc: invoice.totalTtc,
        }),
        updatedAt: new Date(),
      })
      .where(eq(invoicesTable.id, invoice.id));
  }

  let supplierCredit = 0;
  for (const payment of payments) {
    let available = roundMoney(supplierCredit + payment.amount);
    supplierCredit = 0;
    for (const invoice of invoices) {
      const currentRemaining = outstanding.get(invoice.id) ?? 0;
      if (available <= 0 || currentRemaining <= 0 || invoice.settlementType === "AFTER_SALES") continue;
      const allocated = roundMoney(Math.min(available, currentRemaining));
      if (allocated <= 0) continue;

      await tx.insert(paymentAllocationsTable).values({
        paymentId: payment.id,
        invoiceId: invoice.id,
        amountAllocated: allocated,
      });
      outstanding.set(invoice.id, roundMoney(currentRemaining - allocated));
      available = roundMoney(available - allocated);
    }
    supplierCredit = available;
  }

  for (const invoice of invoices) {
    if (invoice.settlementType === "AFTER_SALES") continue;
    const remaining = outstanding.get(invoice.id) ?? roundMoney(invoice.totalTtc);
    const paid = roundMoney(invoice.totalTtc - remaining);
    await tx
      .update(invoicesTable)
      .set({
        amountPaid: paid,
        amountRemaining: remaining,
        paymentStatus: invoiceStatus({
          sourcePaymentStatus: invoice.sourcePaymentStatus,
          settlementType: invoice.settlementType,
          amountPaid: paid,
          totalTtc: invoice.totalTtc,
        }),
        updatedAt: new Date(),
      })
      .where(eq(invoicesTable.id, invoice.id));
  }

  return roundMoney(supplierCredit);
}

export async function withFinancialTransaction<T>(callback: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => callback(tx));
}

export async function getSupplierCredit(executor: Tx = db): Promise<number> {
  const payments = await executor.select({ amount: paymentsTable.amount }).from(paymentsTable);
  const allocations = await executor
    .select({ amountAllocated: paymentAllocationsTable.amountAllocated })
    .from(paymentAllocationsTable);
  return roundMoney(
    payments.reduce((sum: number, payment: { amount: number }) => sum + Number(payment.amount), 0) -
      allocations.reduce((sum: number, allocation: { amountAllocated: number }) => sum + Number(allocation.amountAllocated), 0),
  );
}