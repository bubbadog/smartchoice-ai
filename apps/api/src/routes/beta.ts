import { Router } from 'express'
import { z } from 'zod'

const router = Router()

// Beta user signup schema
const BetaSignupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  userType: z.enum(['consumer', 'power_shopper', 'professional', 'other']),
  interests: z.array(z.string()),
  feedback: z.string().optional(),
  timestamp: z.string(),
  source: z.string().default('beta_onboarding')
})

// Feedback submission schema
const FeedbackSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  type: z.enum(['bug', 'feature', 'general', 'improvement']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  browserInfo: z.object({
    userAgent: z.string().optional(),
    viewport: z.string().optional(),
    url: z.string().optional()
  }).optional(),
  timestamp: z.string()
})

// Analytics event schema
const AnalyticsEventSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string(),
  event: z.string(),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.string()
})

// In-memory storage for beta (replace with database in production)
const betaUsers: Array<z.infer<typeof BetaSignupSchema> & { id: string }> = []
const feedbackSubmissions: Array<z.infer<typeof FeedbackSchema> & { id: string }> = []
const analyticsEvents: Array<z.infer<typeof AnalyticsEventSchema> & { id: string }> = []

// Beta user signup
router.post('/signup', async (req, res) => {
  try {
    const betaUser = BetaSignupSchema.parse(req.body)
    
    // Check if email already exists
    const existingUser = betaUsers.find(user => user.email === betaUser.email)
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered for beta program'
      })
    }
    
    // Add user to beta list
    const newUser = {
      ...betaUser,
      id: `beta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    betaUsers.push(newUser)
    
    // Log analytics event
    analyticsEvents.push({
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: newUser.id,
      sessionId: req.headers['x-session-id'] as string || 'unknown',
      event: 'beta_signup_completed',
      properties: {
        userType: betaUser.userType,
        interestCount: betaUser.interests.length,
        source: betaUser.source
      },
      timestamp: new Date().toISOString()
    })
    
    // TODO: Send welcome email
    // TODO: Add to email list
    // TODO: Send Slack notification to team
    
    console.log(`✅ New beta user: ${betaUser.name} (${betaUser.email}) - ${betaUser.userType}`)
    
    res.json({
      success: true,
      data: {
        id: newUser.id,
        message: 'Successfully joined beta program'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data',
        details: error.errors
      })
    }
    
    console.error('Beta signup error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Submit feedback
router.post('/feedback', async (req, res) => {
  try {
    const feedback = FeedbackSchema.parse(req.body)
    
    // Add feedback to list
    const newFeedback = {
      ...feedback,
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    feedbackSubmissions.push(newFeedback)
    
    // Log analytics event
    analyticsEvents.push({
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: feedback.userId || 'anonymous',
      sessionId: req.headers['x-session-id'] as string || 'unknown',
      event: 'feedback_submitted',
      properties: {
        type: feedback.type,
        severity: feedback.severity,
        category: feedback.category
      },
      timestamp: new Date().toISOString()
    })
    
    // TODO: Send to support system
    // TODO: Send Slack notification for high severity issues
    
    console.log(`📝 New feedback: ${feedback.type} - ${feedback.title}`)
    
    res.json({
      success: true,
      data: {
        id: newFeedback.id,
        message: 'Feedback submitted successfully'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedback data',
        details: error.errors
      })
    }
    
    console.error('Feedback submission error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Track analytics event
router.post('/analytics', async (req, res) => {
  try {
    const event = AnalyticsEventSchema.parse(req.body)
    
    // Add event to analytics
    const newEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    analyticsEvents.push(newEvent)
    
    // TODO: Send to analytics service (e.g., PostHog, Mixpanel)
    
    res.json({
      success: true,
      data: {
        id: newEvent.id,
        message: 'Event tracked'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event data',
        details: error.errors
      })
    }
    
    console.error('Analytics tracking error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Get beta program stats (admin endpoint)
router.get('/stats', async (req, res) => {
  try {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const stats = {
      totalBetaUsers: betaUsers.length,
      totalFeedback: feedbackSubmissions.length,
      totalEvents: analyticsEvents.length,
      last24h: {
        signups: betaUsers.filter(user => new Date(user.timestamp) >= last24h).length,
        feedback: feedbackSubmissions.filter(f => new Date(f.timestamp) >= last24h).length,
        events: analyticsEvents.filter(e => new Date(e.timestamp) >= last24h).length
      },
      last7d: {
        signups: betaUsers.filter(user => new Date(user.timestamp) >= last7d).length,
        feedback: feedbackSubmissions.filter(f => new Date(f.timestamp) >= last7d).length,
        events: analyticsEvents.filter(e => new Date(e.timestamp) >= last7d).length
      },
      userTypes: betaUsers.reduce((acc, user) => {
        acc[user.userType] = (acc[user.userType] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      feedbackTypes: feedbackSubmissions.reduce((acc, feedback) => {
        acc[feedback.type] = (acc[feedback.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      topEvents: analyticsEvents.reduce((acc, event) => {
        acc[event.event] = (acc[event.event] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Beta stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Get recent feedback (admin endpoint)
router.get('/feedback/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const type = req.query.type as string
    
    let feedback = [...feedbackSubmissions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    if (type) {
      feedback = feedback.filter(f => f.type === type)
    }
    
    feedback = feedback.slice(0, limit)
    
    res.json({
      success: true,
      data: feedback,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Recent feedback error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

export { router as betaRouter }