import { Worker } from "bullmq";
import { PinoLogger } from "nestjs-pino";
import { getBullMqConnection } from "../redis/redis-options";
import { VisitData, VisitsService } from "../visits/visits.service";
import { VISIT_WORKER } from "./visitWorker.constant";

export const visitWorker = {
  provide: VISIT_WORKER,
  useFactory: (visitsService: VisitsService, logger: PinoLogger) => {
    logger.setContext("VisitWorker");

    const worker = new Worker<VisitData>(
      "visit",
      async (job) => visitsService.visitProcess(job.data),
      {
        connection: getBullMqConnection(),
      },
    );

    worker.on("ready", () => {
      logger.info("🟢 [visit] worker online, waiting for jobs");
    });

    worker.on("active", (job) => {
      logger.info(
        `🔵 [visit] start   job#${job.id}  link#${job.data.id}  ip=${job.data.ip}`,
      );
    });

    worker.on("completed", (job) => {
      logger.info(
        `✅ [visit] done    job#${job.id}  link#${job.data.id}  attempts=${job.attemptsMade}`,
      );
    });

    worker.on("failed", (job, error) => {
      logger.error(
        { err: error },
        `❌ [visit] FAILED  job#${job?.id}  link#${job?.data?.id}  attempts=${job?.attemptsMade}  ${error.message}`,
      );
    });

    worker.on("error", (error) => {
      logger.error({ err: error }, `🔴 [visit] worker error  ${error.message}`);
    });

    return worker;
  },

  inject: [VisitsService, PinoLogger],
};
