import { and, asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, invoicesTable } from "@workspace/db";
import {
  CancelInvoiceAfterSalesParams,
  GetInvoiceParams,
  GetInvoiceResponse,
  ListInvoicesQueryParams,
  ListInvoicesResponse,
  SettleInvoiceAfterSalesBody,
  SettleInvoiceAfterSalesParams,
  SettleInvoiceAfterSalesResponse,
} from "@workspace/api-zod";
import { recalculateFinancials, withFinancialTransaction } from "../lib/financial";
import { getInvoiceDetail, invoiceSearch } from "../lib/reporting";

const router: IRouter = Router();

router.get("/invoices", async (req, res): Promise<void> => {
  const parsed = ListInvoicesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Impossible de charger les BLs." });
    return;
  }
  const { search, status } = parsed.data;
  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.documentType, "BON DE LIVRAISON"), invoiceSearch(search), status ? eq(invoicesTable.paymentStatus, status) : undefined))
    .orderBy(asc(invoicesTable.invoiceDate), asc(invoicesTable.id));
  res.json(ListInvoicesResponse.parse(invoices.slice().reverse()));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const params = GetInvoiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "BL invalide." });
    return;
  }
  const invoice = await getInvoiceDetail(params.data.id);
  if (!invoice) {
    res.status(404).json({ error: "BL introuvable." });
    return;
  }
  res.json(GetInvoiceResponse.parse(invoice));
});

router.post("/invoices/:id/after-sales", async (req, res): Promise<void> => {
  const params = SettleInvoiceAfterSalesParams.safeParse(req.params);
  const body = SettleInvoiceAfterSalesBody.safeParse(req.body);
  if (!params.success || !body.success || !body.data.comment.trim()) {
    res.status(400).json({ error: "Un commentaire est requis pour le règlement après-vente." });
    return;
  }
  const detail = await withFinancialTransaction(async (tx) => {
    const [invoice] = await tx.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
    if (!invoice) return null;
    await tx.update(invoicesTable).set({
      settlementType: "AFTER_SALES",
      paymentStatus: "AFTER_SALES",
      amountPaid: 0,
      amountRemaining: 0,
      settlementComment: body.data.comment,
      settledAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(invoicesTable.id, params.data.id));
    await recalculateFinancials(tx);
    return getInvoiceDetail(params.data.id, tx);
  });
  if (!detail) {
    res.status(404).json({ error: "BL introuvable." });
    return;
  }
  res.json(SettleInvoiceAfterSalesResponse.parse(detail));
});

router.delete("/invoices/:id/after-sales", async (req, res): Promise<void> => {
  const params = CancelInvoiceAfterSalesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "BL invalide." });
    return;
  }
  const detail = await withFinancialTransaction(async (tx) => {
    const [invoice] = await tx.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.id));
    if (!invoice) return null;
    await tx.update(invoicesTable).set({
      settlementType: "NONE",
      settlementComment: null,
      settledAt: null,
      updatedAt: new Date(),
    }).where(eq(invoicesTable.id, params.data.id));
    await recalculateFinancials(tx);
    return getInvoiceDetail(params.data.id, tx);
  });
  if (!detail) {
    res.status(404).json({ error: "BL introuvable." });
    return;
  }
  res.json(SettleInvoiceAfterSalesResponse.parse(detail));
});

export default router;