import { Controller, Get, Header, Param, Redirect, Req } from "@nestjs/common";
import {
  ApiExcludeController,
  ApiFoundResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
} from "@nestjs/swagger";
import { LinksService } from "./links.service";
import { getLinkDto, VisitContext } from "./dto";
import type { Request } from "express";
import { Throttle } from "@nestjs/throttler";

function headerValue(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || "unknown";
}

function visitContext(request: Request): VisitContext {
  return {
    ip: request.ip ?? "unknown",
    userAgent: headerValue(request.headers["user-agent"]),
    referer: headerValue(request.headers["referer"]),
  };
}

/**
 * Public redirect for a short-link domain attached to this same project.
 * REDIRECT_HOST is read when the process boots. Never put behind the JWT guard.
 */
@ApiExcludeController()
@Controller({ host: process.env.REDIRECT_HOST })
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(":shortCode")
  @Redirect()
  @ApiOperation({
    summary:
      "Resolve a short code and redirect the visitor to the original URL",
  })
  @ApiParam({ name: "shortCode", example: "abc123" })
  @ApiFoundResponse({ description: "Redirects (302) to the original URL" })
  @ApiNotFoundResponse({ description: "No link exists for this short code" })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Header("Cache-Control", "no-store")
  async redirect(@Param() getData: getLinkDto, @Req() request: Request) {
    const originalUrl = await this.linksService.visitLink(
      visitContext(request),
      getData,
    );

    return { url: originalUrl, statusCode: 302 };
  }
}

/**
 * Same redirect, reached by the separate short-link Vercel project.
 * That project keeps its own hostname so a custom domain can be attached later.
 */
@ApiExcludeController()
@Controller("api/go")
export class GoRedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(":shortCode")
  @Redirect()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Header("Cache-Control", "no-store")
  async redirect(@Param() getData: getLinkDto, @Req() request: Request) {
    const originalUrl = await this.linksService.visitLink(
      visitContext(request),
      getData,
    );

    return { url: originalUrl, statusCode: 302 };
  }
}
