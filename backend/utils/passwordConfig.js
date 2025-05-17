import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";
import User from "../models/user.js";
import bcrypt from "bcryptjs";

export const configurePassport = () => {
  console.log("Configuring Passport...");
  console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set");
  console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set");

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("Google OAuth credentials are missing. Google OAuth routes will not work.");
    return;
  }

  try {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log("Google OAuth Callback - Profile:", profile);
            let user = await User.findOne({ email: profile.emails[0].value });
            if (user) {
              console.log("Existing user found:", user.email);
              return done(null, user);
            }

            user = new User({
              username: profile.displayName || `user${profile.id}`,
              email: profile.emails[0].value,
              password: await bcrypt.hash(profile.id + Date.now(), 10),
            });
            await user.save();
            console.log("New user created:", user.email);
            return done(null, user);
          } catch (err) {
            console.error("Google OAuth callback error:", err);
            return done(err, null);
          }
        }
      )
    );
    console.log("Google OAuth Strategy registered successfully.");
  } catch (err) {
    console.error("Failed to register Google OAuth Strategy:", err);
  }

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user._id);
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      console.log("Deserializing user:", user ? user._id : "Not found");
      done(null, user);
    } catch (err) {
      console.error("Deserialize user error:", err);
      done(err, null);
    }
  });
};