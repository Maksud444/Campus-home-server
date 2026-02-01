import app from './server.js'

// For Vercel serverless
export default app

// For local development
const PORT = process.env.PORT || 5000

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}