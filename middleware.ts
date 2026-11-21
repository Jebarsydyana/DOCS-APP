import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

// Pages are protected here. API routes are excluded on purpose:
// each one checks auth() itself and returns 401 JSON instead of an HTML redirect.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};