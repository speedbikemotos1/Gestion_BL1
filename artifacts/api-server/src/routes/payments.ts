import { asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, paymentsTable } from "@workspace/db";
import {
  CreatePaymentBody,
  CreatePaymentResponse,
  DeletePaymentParams,
  GetPaymentParams,
  GetPaymentResponse,
  ListPaymentsResponse,
  UpdatePaymentBody,
  UpdatePaymentParams,
  UpdatePaymentResponse,
} from "@workspace/api-zod";
import { getDashboard } from "../lib/reporting";
import { getPaymentView } from "../lib/reporting";
import { recalculateFinancials, withFinancialTransaction } from "../lib/financial";

const router: IRouter = Router();

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function savePayment(data: { paymentDate: Date; amount: number; paymentMethod?: string | null; reference?: string | null; notes?: string | null }, id?: number) {
  return withFinancialTransaction(async (tx) => {
    let paymentId = id;
    if (id) {
      const [existing] = await tx.select({ id: paymentsTable.id }).from(paymentsTable).where(eq(paymentsTable.id, id));
      if (!existing) return null;
      await tx.update(paymentsTable).set({
        paymentDate: dateOnly(data.paymentDate),
        amount: data.amount,
        paymentMethod: data.paymentMethod ?? null,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
      }).where(eq(paymentsTable.id, id));
    } else {
      const [created] = await tx.insert(paymentsTable).values({
        paymentDate: dateOnly(data.paymentDate),
        amount: data.amount,
        paymentMethod: data.paymentMethod ?? null,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
      }).returning({ id: paymentsTable.id });
      paymentId = created.id;
    }
    await recalculateFinancials(tx);
    const payment = await getPaymentView(paymentId!, tx);
    const dashboard = await getDashboard(tx);
    return { payment, dashboard };
  });
}

router.get("/payments", async (_req, res): Promise<void> => {
  const payments = await db.select({ id: paymentsTable.id }).from(paymentsTable).orderBy(desc(paymentsTable.paymentDate), desc(paymentsTable.id));
  const views = await Promise.all(payments.map((payment) => getPaymentView(payment.id)));
  res.json(ListPaymentsResponse.parse(views.filter(Boolean)));
});

router.get("/payments/:id", async (req, res): Promise<void> => {
  const params = GetPaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Paiement invalide." });
    return;
  }
  const payment = await getPaymentView(params.data.id);
  if (!payment) {
    res.status(404).json({ error: "Paiement introuvable." });
    return;
  }
  res.json(GetPaymentResponse.parse(payment));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Impossible d'enregistrer le paiement. Veuillez réessayer." });
    return;
  }
  const result = await savePayment(parsed.data);
  if (!result?.payment) {
    res.status(400).json({ error: "Impossible d'enregistrer le paiement. Veuillez réessayer." });
    return;
  }
  res.status(201).json(CreatePaymentResponse.parse(result));
});

router.patch("/payments/:id", async (req, res): Promise<void> => {
  const params = UpdatePaymentParams.safeParse(req.params);
  const body = UpdatePaymentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Impossible d'enregistrer le paiement. Veuillez réessayer." });
    return;
  }
  const result = await savePayment(body.data, params.data.id);
  if (!result?.payment) {
    res.status(404).json({ error: "Paiement introuvable." });
    return;
  }
  res.json(UpdatePaymentResponse.parse(result));
});

router.delete("/payments/:id", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Paiement invalide." });
    return;
  }
  const deleted = await withFinancialTransaction(async (tx) => {
    const [existing] = await tx.select({ id: paymentsTable.id }).from(paymentsTable).where(eq(paymentsTable.id, params.data.id));
    if (!existing) return false;
    await tx.delete(paymentsTable).where(eq(paymentsTable.id, params.data.id));
    await recalculateFinancials(tx);
    return true;
  });
  if (!deleted) {
    res.status(404).json({ error: "Paiement introuvable." });
    return;
  }
  res.sendStatus(204);
});

export default router;