import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await prisma.user.findUnique({ where: { email: credentials.email as string } });
          if (!user || !user.password) return null;
          const isValid = await bcrypt.compare(credentials.password as string, user.password);
          if (!isValid) return null;
          return { id: user.id, name: user.name, email: user.email, role: user.role, image: user.image };
        } catch (e) { console.error("Auth error:", e); return null; }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as { role: Role }).role; }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) { session.user.id = token.id as string; session.user.role = token.role as Role; }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ["*"],
  founder: ["dashboard", "admin", "finance", "operations", "sales"],
  sales: ["dashboard", "sales"],
  ticket_admin: ["dashboard", "tickets"],
  logistics: ["dashboard", "logistics"],
  finance: ["dashboard", "finance"],
  operations: ["dashboard", "operations"],
};

declare module "next-auth" {
  interface Session { user: { id: string; name: string; email: string; role: Role; image?: string }; }
  interface User { role: Role; }
}
declare module "next-auth/jwt" { interface JWT { id: string; role: Role; } }