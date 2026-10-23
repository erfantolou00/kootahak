import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

const CLIENT_IP = /^[0-9a-fA-F:.]+$/;

@Injectable()
export class VisitorIpMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction) {
    const header = request.headers["x-kootahak-client-ip"];
    const ip = (Array.isArray(header) ? header[0] : header)?.split(",")[0]?.trim();

    if (ip && ip.length <= 64 && CLIENT_IP.test(ip)) {
      request.headers["x-forwarded-for"] = ip;
    }

    next();
  }
}
