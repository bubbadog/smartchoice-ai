import { Router, Request, Response } from 'express'
import { UserPreferencesSchema } from '@smartchoice-ai/shared-types'
import { authenticate } from '../middleware/authMiddleware'
import { getSupabaseClient } from '../config/supabase'

const router = Router()
const supabase = getSupabaseClient()

/**
 * GET /api/users/preferences
 * Get user preferences (requires authentication)
 */
router.get('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', req.user.userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching preferences:', error)
      res.status(500).json({ error: 'Failed to fetch preferences' })
      return
    }

    // Return default preferences if none exist
    const preferences = data || {
      categories: [],
      priceRange: {},
      brands: [],
      features: [],
      dealThreshold: 70,
      currency: 'USD',
      language: 'en',
      notifications: {
        priceDrops: true,
        newDeals: true,
        recommendations: true,
      },
    }

    res.json(preferences)
  } catch (error) {
    console.error('Preferences error:', error)
    res.status(500).json({ error: 'Failed to get preferences' })
  }
})

/**
 * PUT /api/users/preferences
 * Update user preferences (requires authentication)
 */
router.put('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    // Validate preferences
    const preferences = UserPreferencesSchema.parse(req.body)

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: req.user.userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating preferences:', error)
      res.status(500).json({ error: 'Failed to update preferences' })
      return
    }

    res.json(data)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid preferences data', details: error })
      return
    }
    console.error('Update preferences error:', error)
    res.status(500).json({ error: 'Failed to update preferences' })
  }
})

/**
 * GET /api/users/history
 * Get user search history (requires authentication)
 */
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const { limit = 20, offset = 0 } = req.query

    const { data, error, count } = await supabase
      .from('search_history')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.userId)
      .order('timestamp', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (error) {
      console.error('Error fetching history:', error)
      res.status(500).json({ error: 'Failed to fetch search history' })
      return
    }

    res.json({
      history: data || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    })
  } catch (error) {
    console.error('History error:', error)
    res.status(500).json({ error: 'Failed to get search history' })
  }
})

/**
 * POST /api/users/interactions
 * Track user interactions (requires authentication)
 */
router.post('/interactions', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const { type, productId, searchQuery, metadata } = req.body

    if (!type || !['search', 'click', 'save', 'purchase', 'compare', 'share'].includes(type)) {
      res.status(400).json({ error: 'Invalid interaction type' })
      return
    }

    const { error } = await supabase
      .from('user_interactions')
      .insert({
        user_id: req.user.userId,
        type,
        product_id: productId,
        search_query: searchQuery,
        metadata,
        timestamp: new Date().toISOString(),
      })

    if (error) {
      console.error('Error tracking interaction:', error)
      res.status(500).json({ error: 'Failed to track interaction' })
      return
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Interaction tracking error:', error)
    res.status(500).json({ error: 'Failed to track interaction' })
  }
})

export default router