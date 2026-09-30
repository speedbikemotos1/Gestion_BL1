import { Router, type IRouter } from "express";
import { GetDashboardResponse } from "@workspace/api-zod";
import { getDashboard } from "../lib/reporting";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  res.json(GetDashboardResponse.parse(await getDashboard()));
});

export default router;