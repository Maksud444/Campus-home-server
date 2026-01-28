import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import User from '../models/User.model.js'

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'your-secret-key'
}

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.id)
    if (user) {
      return done(null, user)
    }
    return done(null, false)
  } catch (error) {
    return done(error, false)
  }
}))

// Google OAuth Strategy (only if credentials exist)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL || 'https://student-housing-backend.vercel.app'}/api/auth/callback/google`,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ 
          $or: [
            { googleId: profile.id },
            { email: profile.emails[0].value }
          ]
        })

        if (user) {
          if (!user.googleId) {
            user.googleId = profile.id
            await user.save()
          }
          return done(null, user)
        }

        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          avatar: profile.photos[0]?.value,
          role: 'student',
          password: Math.random().toString(36).slice(-12),
          isVerified: true
        })

        return done(null, user)
      } catch (error) {
        return done(error, false)
      }
    }
  ))
  console.log('✅ Google OAuth enabled')
} else {
  console.log('⚠️  Google OAuth disabled - credentials missing')
}

// Facebook OAuth Strategy (only if credentials exist)
if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL || 'https://student-housing-backend.vercel.app'}/api/auth/callback/facebook`,
      profileFields: ['id', 'displayName', 'email', 'photos']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ 
          $or: [
            { facebookId: profile.id },
            { email: profile.emails?.[0]?.value }
          ]
        })

        if (user) {
          if (!user.facebookId) {
            user.facebookId = profile.id
            await user.save()
          }
          return done(null, user)
        }

        user = await User.create({
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          facebookId: profile.id,
          avatar: profile.photos?.[0]?.value,
          role: 'student',
          password: Math.random().toString(36).slice(-12),
          isVerified: true
        })

        return done(null, user)
      } catch (error) {
        return done(error, false)
      }
    }
  ))
  console.log('✅ Facebook OAuth enabled')
} else {
  console.log('⚠️  Facebook OAuth disabled - credentials missing')
}

export default passport;