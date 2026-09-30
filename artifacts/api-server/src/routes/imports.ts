import { Router, type IRouter } from "express";
import { ImportSqlBody, ImportSqlResponse } from "@workspace/api-zod";
import { importSqlText } from "../lib/importer";

const router: IRouter = Router();

router.post("/imports/sql", async (req, res): Promise<void> => {
  const parsed = ImportSqlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Impossible d'importer le fichier SQL. Vérifiez le fichier et réessayez." });
    return;
  }
  try {
    const result = await importSqlText(parsed.data.sqlText);
    res.json(ImportSqlResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "SQL import failed");
    res.status(400).json({ error: "Impossible d'importer le fichier SQL. Vérifiez le fichier et réessayez." });
  }
});

export default router;