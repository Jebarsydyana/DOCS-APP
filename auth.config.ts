import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const loggedIn = !!auth?.user;
      const isAuthPage = ["/login", "/signup"].includes(nextUrl.pathname);
      if (isAuthPage) {
        return loggedIn ? Response.redirect(new URL("/docs", nextUrl)) : true;
      }
      return loggedIn; // false redirects to /login
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;