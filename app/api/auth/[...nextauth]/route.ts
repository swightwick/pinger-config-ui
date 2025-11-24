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
    async signIn({ user, account, profile }) {
      console.log('=== Discord Sign In ===')
      console.log('User:', JSON.stringify(user, null, 2))
      console.log('Account:', JSON.stringify(account, null, 2))
      console.log('Profile:', JSON.stringify(profile, null, 2))
      console.log('Discord ID:', profile?.id)
      console.log('======================')
      return true
    },
    async session({ session, token }) {
      // Add Discord ID to session
      if (token.sub) {
        session.user.discordId = token.sub
      }
      console.log('=== Session Callback ===')
      console.log('Session:', JSON.stringify(session, null, 2))
      console.log('Token:', JSON.stringify(token, null, 2))
      console.log('Discord ID:', session.user.discordId)
      console.log('========================')
      return session
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        console.log('=== JWT Callback ===')
        console.log('Token:', JSON.stringify(token, null, 2))
        console.log('Account:', JSON.stringify(account, null, 2))
        console.log('Profile:', JSON.stringify(profile, null, 2))
        console.log('Discord ID:', profile.id)
        console.log('====================')
        // Store Discord ID in token
        token.discordId = profile.id
      }
      return token
    },
  },
})

export { handler as GET, handler as POST }
