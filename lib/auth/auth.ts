import NextAuth from "next-auth";
import { db } from "@/lib/db/config/client";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import GoogleProvider from "next-auth/providers/google";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/config/schema";
import { eq } from "drizzle-orm";

const production = process.env.NODE_ENV === "production";

const baseAdapter = DrizzleAdapter(db, {
  usersTable: users as any,
  accountsTable: accounts,
  sessionsTable: sessions as any,
  verificationTokensTable: verificationTokens,
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: {
    ...baseAdapter,
    async createUser(user: any) {
      const avatarUrl = user.image || user.avatarUrl || null;
      const { image, ...userData } = user;
      if (!baseAdapter.createUser) throw new Error("createUser not implemented");
      return baseAdapter.createUser({
        ...userData,
        avatarUrl,
      });
    },
    async updateUser(user: any) {
      const avatarUrl = user.image || user.avatarUrl || undefined;
      const { image, ...userData } = user;
      if (!baseAdapter.updateUser) throw new Error("updateUser not implemented");
      return baseAdapter.updateUser({
        ...userData,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      });
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    // When a user signs in with Google, always sync their verified Google name and Google avatar!
    async signIn({ user, profile }) {
      if (user?.email) {
        const cleanEmail = user.email.toLowerCase().trim();
        const googleName = profile?.name || user.name;
        const googleAvatar =
          (profile as any)?.picture ||
          (profile as any)?.avatar_url ||
          (user as any)?.image ||
          (user as any)?.avatarUrl ||
          null;

        try {
          await db
            .update(users)
            .set({
              ...(googleName ? { name: googleName } : {}),
              ...(googleAvatar ? { avatarUrl: googleAvatar } : {}),
              updatedAt: new Date(),
            })
            .where(eq(users.email, cleanEmail));
        } catch (err) {
          console.warn("Could not sync Google user profile on signIn event:", err);
        }
      }
    },
  },
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = profile?.name || user.name;
        token.picture =
          (profile as any)?.picture ||
          (user as any)?.avatarUrl ||
          (user as any)?.image ||
          token.picture;
      }
      return token;
    },

    async session({ session, token }) {
      if (session?.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).avatarUrl = (token.picture as string) || null;
        session.user.image = (token.picture as string) || null;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: production ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: production,
        maxAge: 30 * 24 * 60 * 60,
      },
    },
    callbackUrl: {
      name: production ? "__Secure-authjs.callback-url" : "authjs.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: production,
      },
    },
    csrfToken: {
      name: production ? "__Host-authjs.csrf-token" : "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: production,
      },
    },
  },
  secret: process.env.AUTH_SECRET,
});
