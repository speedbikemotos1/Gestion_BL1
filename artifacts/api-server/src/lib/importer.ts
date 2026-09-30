import fs from "node:fs/promises";
import path from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { db, invoiceLinesTable, invoicesTable } from "@workspace/db";
import { recalculateFinancials } from "./financial";

const EXPECTED = {
  invoiceCount: 17,
  lineCount: 93,
  totalUnits: 672,
  totalHt: 17813.104,
  totalVat: 3384.489,
  fiscalStamp: 1,
  totalTtc: 21198.593,
};

type SqlValue = string | number | null;
type InvoiceRow = {
  sourceId: number;
  invoiceNumber: string;
  invoiceDate: string;
  supplier: string;
  customer: string;
  documentType: string;
  totalHt: number;
  totalVat: number;
  fiscalStamp: number;
  totalTtc: number;
  sourcePaymentStatus: string | null;
  notes: string | null;
};
type LineRow = {
  sourceInvoiceId: number;
  lineNumber: number;
  productReference: string | null;
  productDescription: string;
  quantity: number;
  unitHt: number | null;
  discountPercent: number;
  lineNetHt: number;
  vatRate: number;
  lineTtc: number;
  notes: string | null;
};

function tupleRows(sqlText: string, table: string): SqlValue[][] {
  const lowerSql = sqlText.toLowerCase();
  const insertIndex = lowerSql.indexOf(`insert into ${table.toLowerCase()}`);
  if (insertIndex < 0) return [];
  const valuesIndex = lowerSql.indexOf("values", insertIndex);
  if (valuesIndex < 0) return [];
  let endIndex = sqlText.length;
  let quotedStatement = false;
  for (let index = valuesIndex + 6; index < sqlText.length; index += 1) {
    const char = sqlText[index];
    const next = sqlText[index + 1];
    if (char === "'" && quotedStatement && next === "'") {
      index += 1;
      continue;
    }
    if (char === "'") quotedStatement = !quotedStatement;
    if (char === ";" && !quotedStatement) {
      endIndex = index;
      break;
    }
  }
  const values = sqlText.slice(valuesIndex + 6, endIndex);
  const rows: string[] = [];
  let current = "";
  let depth = 0;
  let quoted = false;
  for (let index = 0; index < values.length; index += 1) {
    const char = values[index];
    const next = values[index + 1];
    if (char === "'" && quoted && next === "'") {
      current += "''";
      index += 1;
      continue;
    }
    if (char === "'") {
      quoted = !quoted;
      current += char;
      continue;
    }
    if (!quoted && char === "(") {
      if (depth === 0) current = "";
      depth += 1;
      current += char;
      continue;
    }
    if (!quoted && char === ")") {
      depth -= 1;
      current += char;
      if (depth === 0) rows.push(current.slice(1, -1));
      continue;
    }
    if (depth > 0) current += char;
  }
  return rows.map(splitTuple);
}

function splitTuple(tuple: string): SqlValue[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < tuple.length; index += 1) {
    const char = tuple[index];
    const next = tuple[index + 1];
    if (char === "'" && quoted && next === "'") {
      current += "''";
      index += 1;
      continue;
    }
    if (char === "'") quoted = !quoted;
    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values.map((value) => {
    if (value.toUpperCase() === "NULL") return null;
    if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replaceAll("''", "'");
    const number = Number(value);
    return Number.isNaN(number) ? value : number;
  });
}

const stringValue = (value: SqlValue) => (value == null ? null : String(value));
const numberValue = (value: SqlValue) => (value == null ? 0 : Number(value));
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

function parseInvoices(sqlText: string): InvoiceRow[] {
  return tupleRows(sqlText, "invoices").map((row) => ({
    sourceId: numberValue(row[0]),
    invoiceNumber: String(row[1]),
    invoiceDate: String(row[2]),
    supplier: String(row[3]),
    customer: String(row[4]),
    documentType: String(row[5]),
    totalHt: numberValue(row[6]),
    totalVat: numberValue(row[7]),
    fiscalStamp: numberValue(row[8]),
    totalTtc: numberValue(row[9]),
    sourcePaymentStatus: stringValue(row[10]),
    notes: stringValue(row[11]),
  }));
}

function parseLines(sqlText: string): LineRow[] {
  return tupleRows(sqlText, "invoice_lines").map((row) => ({
    sourceInvoiceId: numberValue(row[1]),
    lineNumber: numberValue(row[2]),
    productReference: stringValue(row[3]),
    productDescription: String(row[4]),
    quantity: numberValue(row[5]),
    unitHt: row[6] == null ? null : numberValue(row[6]),
    discountPercent: numberValue(row[7]),
    lineNetHt: numberValue(row[8]),
    vatRate: numberValue(row[9]),
    lineTtc: numberValue(row[10]),
    notes: stringValue(row[11]),
  }));
}

export async function getDatasetTotals(executor: any = db) {
  const [invoiceTotals] = await executor
    .select({
      count: sql<number>`count(*)`,
      totalHt: sql<number>`coalesce(sum(${invoicesTable.totalHt}), 0)`,
      totalVat: sql<number>`coalesce(sum(${invoicesTable.totalVat}), 0)`,
      fiscalStamp: sql<number>`coalesce(sum(${invoicesTable.fiscalStamp}), 0)`,
      totalTtc: sql<number>`coalesce(sum(${invoicesTable.totalTtc}), 0)`,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.documentType, "BON DE LIVRAISON"));
  const [lineTotals] = await executor
    .select({
      count: sql<number>`count(*)`,
      totalUnits: sql<number>`coalesce(sum(${invoiceLinesTable.quantity}), 0)`,
    })
    .from(invoiceLinesTable);
  return {
    invoiceCount: Number(invoiceTotals.count),
    lineCount: Number(lineTotals.count),
    totalUnits: Number(lineTotals.totalUnits),
    totalHt: roundMoney(Number(invoiceTotals.totalHt)),
    totalVat: roundMoney(Number(invoiceTotals.totalVat)),
    fiscalStamp: roundMoney(Number(invoiceTotals.fiscalStamp)),
    totalTtc: roundMoney(Number(invoiceTotals.totalTtc)),
  };
}

export function validationWarnings(totals: Awaited<ReturnType<typeof getDatasetTotals>>) {
  const warnings: string[] = [];
  const checks: Array<[keyof typeof EXPECTED, string]> = [
    ["invoiceCount", "BL"],
    ["lineCount", "lignes produit"],
    ["totalUnits", "unités"],
    ["totalHt", "total HT"],
    ["totalVat", "TVA"],
    ["fiscalStamp", "timbre fiscal"],
    ["totalTtc", "total TTC"],
  ];
  for (const [key, label] of checks) {
    if (totals[key] !== EXPECTED[key]) {
      warnings.push(`La source contient ${totals[key].toLocaleString("fr-FR")} ${label} (cible attendue : ${EXPECTED[key].toLocaleString("fr-FR")}).`);
    }
  }
  return warnings;
}

export async function importSqlText(sqlText: string) {
  return db.transaction(async (tx) => {
    const invoices = parseInvoices(sqlText).filter((invoice) => invoice.documentType === "BON DE LIVRAISON");
    const lines = parseLines(sqlText);
    const sourceIdToDatabaseId = new Map<number, number>();
    let importedInvoices = 0;
    let duplicateInvoices = 0;
    let importedLines = 0;

    for (const invoice of invoices) {
      const existing = await tx
        .select({ id: invoicesTable.id })
        .from(invoicesTable)
        .where(eq(invoicesTable.invoiceNumber, invoice.invoiceNumber));
      if (existing[0]) {
        sourceIdToDatabaseId.set(invoice.sourceId, existing[0].id);
        duplicateInvoices += 1;
        continue;
      }
      const [inserted] = await tx.insert(invoicesTable).values({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        supplier: invoice.supplier,
        customer: invoice.customer,
        documentType: invoice.documentType,
        totalHt: invoice.totalHt,
        totalVat: invoice.totalVat,
        fiscalStamp: invoice.fiscalStamp,
        totalTtc: invoice.totalTtc,
        sourcePaymentStatus: invoice.sourcePaymentStatus,
        paymentStatus: "UNSPECIFIED",
        amountPaid: 0,
        amountRemaining: invoice.totalTtc,
        settlementType: "NONE",
        notes: invoice.notes,
      }).returning({ id: invoicesTable.id });
      sourceIdToDatabaseId.set(invoice.sourceId, inserted.id);
      importedInvoices += 1;
    }

    for (const line of lines) {
      const invoiceId = sourceIdToDatabaseId.get(line.sourceInvoiceId);
      if (!invoiceId) continue;
      const existingLine = await tx
        .select({ id: invoiceLinesTable.id })
        .from(invoiceLinesTable)
        .where(
          sql`${invoiceLinesTable.invoiceId} = ${invoiceId} AND ${invoiceLinesTable.lineNumber} = ${line.lineNumber}`,
        );
      if (existingLine[0]) continue;
      await tx.insert(invoiceLinesTable).values({
        invoiceId,
        lineNumber: line.lineNumber,
        productReference: line.productReference,
        productDescription: line.productDescription,
        quantity: line.quantity,
        unitHt: line.unitHt,
        discountPercent: line.discountPercent,
        lineNetHt: line.lineNetHt,
        vatRate: line.vatRate,
        lineTtc: line.lineTtc,
        notes: line.notes,
      });
      importedLines += 1;
    }

    await recalculateFinancials(tx);
    const totals = await getDatasetTotals(tx);
    return {
      importedInvoices,
      importedLines,
      duplicateInvoices,
      ...totals,
      message: duplicateInvoices > 0 && importedInvoices === 0
        ? "Import terminé — aucun doublon ajouté"
        : "Import terminé",
      warnings: validationWarnings(totals),
    };
  });
}

export async function ensureInitialImport() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(invoicesTable);
  if (Number(count) > 0) return false;
  const candidates = [
    path.resolve(process.cwd(), "attached_assets/Speed_Bike_Motos_17_Invoices_CLEAN_MASTER_1790678821195.sql"),
    path.resolve(process.cwd(), ".local/conversation-workspace/files/attached_assets/Speed_Bike_Motos_17_Invoices_CLEAN_MASTER_1790678821195.sql"),
    path.resolve(process.cwd(), "../../attached_assets/Speed_Bike_Motos_17_Invoices_CLEAN_MASTER_1790678821195.sql"),
  ];
  for (const candidate of candidates) {
    try {
      const sqlText = await fs.readFile(candidate, "utf8");
      await importSqlText(sqlText);
      return true;
    } catch {
      // The app remains usable with an empty database when the optional source file is unavailable.
    }
  }
  return false;
}