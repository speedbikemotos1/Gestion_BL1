import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import invoicesRouter from "./invoices";
import paymentsRouter from "./payments";
import importsRouter from "./imports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(invoicesRouter);
router.use(paymentsRouter);
router.use(importsRouter);

export default router;
