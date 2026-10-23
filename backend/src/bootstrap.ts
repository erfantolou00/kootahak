try {
  // Local and Docker development read backend/.env. Vercel and the production
  // image inject variables and do not install this devDependency.
  require("dotenv/config");
} catch {
  // Environment variables are already present.
}

if (!process.env.TZ) {
  process.env.TZ = "Asia/Tehran";
}
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import helmet from "helmet";
import { json, urlencoded } from "express";
import type { Express } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const isProduction = process.env.NODE_ENV === "production";

  app.useLogger(app.get(Logger));

  // --- Security middleware (must run before routing) ---
  app.use(helmet());
  app.use(cookieParser());
  // Reject oversized request bodies before they're read into memory.
  app.use(json({ limit: "16kb" }));
  app.use(urlencoded({ limit: "16kb", extended: false }));
  const expressInstance = app.getHttpAdapter().getInstance() as Express;
  // Don't advertise the framework to clients.
  expressInstance.disable("x-powered-by");
  // Trust the first proxy hop (nginx) so req.ip is the real client IP used by the rate limiter.
  expressInstance.set("trust proxy", 1);

  const frontEndUrl = process.env.FRONT_END_URL;
  if (!frontEndUrl) {
    throw new Error("FRONT_END_URL environment variable is required");
  }

  app.enableCors({
    origin: frontEndUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // --- Validation ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: isProduction,
    }),
  );

  // --- API docs ---
  // Swagger exposes the full API surface (every route, DTO, validation rule),
  // so it must not be reachable in production.
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle("API")
      .setDescription("API docs")
      .setVersion("1.0")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}
bootstrap();
