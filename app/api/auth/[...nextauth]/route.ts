import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn() {
      return true
    },
    async session({ session, token }) {
      if (token.sub) {
        (session.user as any).discordId = token.sub
      }
      return session
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        (token as any).discordId = (profile as any).id
      }
      return token
    },
  },
})

export { handler as GET, handler as POST }
