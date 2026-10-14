import type { RequestHandler } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { getClerkProxyHost } from "./clerkProxyMiddleware";

export const requireOwner: RequestHandler = async (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) {
    res.status(503).json({ error: "Owner access is not configured" });
    return;
  }

  // Reject cross-origin cookie-authenticated writes, including signed upload requests.
  const origin = req.headers.origin;
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && origin) {
    try {
      if (new URL(origin).host !== getClerkProxyHost(req)) {
        res.status(403).json({ error: "Cross-origin request denied" });
        return;
      }
    } catch {
      res.status(403).json({ error: "Invalid request origin" });
      return;
    }
  }

  try {
    // Resolve verified identity on the server; never trust browser-supplied emails
    // or make the first account to sign up the owner. No app data is copied.
    const user = await clerkClient.users.getUser(userId);
    const isOwner = user.emailAddresses.some(
      (email) => email.emailAddress.toLowerCase() === ownerEmail &&
        email.verification?.status === "verified",
    );
    if (!isOwner) {
      res.status(403).json({ error: "This dashboard is private" });
      return;
    }
    next();
  } catch {
    req.log.warn("Owner verification is temporarily unavailable");
    res.status(503).json({ error: "Could not verify access. Please try again." });
  }
};
