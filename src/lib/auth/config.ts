import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import CredentialsProvider from 'next-auth/providers/credentials'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),

    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('❌ Missing credentials')
          throw new Error('Please enter email and password')
        }

        try {
          console.log('🔐 Attempting login to:', `${API_URL}/api/auth/login`)
          console.log('📧 Email:', credentials.email)
          
          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              email: credentials.email.trim().toLowerCase(),
              password: credentials.password,
            }),
          })

          console.log('📡 Response status:', res.status)

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            console.error('❌ Login failed:', errorData)
            throw new Error(errorData.message || 'Invalid credentials')
          }

          const data = await res.json()
          console.log('✅ Login successful:', data)

          if (!data.success || !data.user) {
            throw new Error('Invalid response from server')
          }

          return {
            id: data.user._id || data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role || 'student',
            image: data.user.avatar || data.user.image,
            accessToken: data.token
          }
        } catch (error: any) {
          console.error('❌ Authorize error:', error)
          throw error
        }
      }
    })
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        try {
          console.log('🔐 OAuth sign in:', user.email)
          
          const res = await fetch(`${API_URL}/api/auth/oauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              avatar: user.image,
              provider: account.provider,
              role: 'student'
            }),
          })

          const data = await res.json()

          if (data.success && data.user) {
            user.id = data.user._id || data.user.id
            user.name = data.user.name
            user.image = data.user.avatar || data.user.image
            ;(user as any).role = data.user.role
            ;(user as any).accessToken = data.token
          }
        } catch (error) {
          console.error('❌ OAuth error:', error)
        }
      }
      return true
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role || 'student'
        token.accessToken = (user as any).accessToken
        console.log('✅ JWT token created:', { id: token.id, role: token.role })
      }

      if (trigger === 'update' && session?.user) {
        if (session.user.name) token.name = session.user.name
        if (session.user.image) token.picture = session.user.image
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
        ;(session as any).accessToken = token.accessToken
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || baseUrl
      
      if (url.startsWith('/')) {
        return `${APP_URL}${url}`
      }
      
      try {
        const urlObj = new URL(url)
        const appUrlObj = new URL(APP_URL)
        if (urlObj.origin === appUrlObj.origin) {
          return url
        }
      } catch (e) {}
      
      return `${APP_URL}/dashboard`
    }
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug logs
}
