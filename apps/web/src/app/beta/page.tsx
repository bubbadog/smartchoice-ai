'use client'

import { useState } from 'react'
import { ArrowRightIcon, CheckCircleIcon, UserGroupIcon, ChatBubbleLeftRightIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface BetaUser {
  name: string
  email: string
  userType: 'consumer' | 'power_shopper' | 'professional' | 'other'
  interests: string[]
  feedback: string
}

export default function BetaOnboarding() {
  const [step, setStep] = useState(1)
  const [betaUser, setBetaUser] = useState<BetaUser>({
    name: '',
    email: '',
    userType: 'consumer',
    interests: [],
    feedback: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleInputChange = (field: keyof BetaUser, value: string | string[]) => {
    setBetaUser(prev => ({ ...prev, [field]: value }))
  }

  const handleInterestToggle = (interest: string) => {
    setBetaUser(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Analytics tracking
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'beta_signup', {
          user_type: betaUser.userType,
          interests: betaUser.interests.join(','),
          step: 'completed'
        })
      }

      // Send to backend (placeholder for now)
      const response = await fetch('/api/beta/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...betaUser,
          timestamp: new Date().toISOString(),
          source: 'beta_onboarding'
        })
      })

      if (response.ok) {
        setSubmitted(true)
        setStep(4)
      } else {
        throw new Error('Failed to submit beta signup')
      }
    } catch (error) {
      console.error('Beta signup error:', error)
      alert('Error submitting signup. Please try again or contact support.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const interests = [
    'Electronics & Tech',
    'Home & Garden',
    'Fashion & Clothing',
    'Sports & Outdoors',
    'Health & Beauty',
    'Books & Media',
    'Food & Grocery',
    'Automotive',
    'Tools & Hardware',
    'Travel & Experiences'
  ]

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SmartChoice AI Beta!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for joining our beta program. We'll send you access instructions within 24 hours.
          </p>
          
          <div className="space-y-4">
            <a 
              href="/"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Using SmartChoice AI
            </a>
            
            <div className="text-sm text-gray-500">
              <p>Questions? Contact us:</p>
              <div className="flex justify-center space-x-4 mt-2">
                <a href="mailto:beta@smartchoice.ai" className="text-blue-600 hover:underline">
                  Email Support
                </a>
                <span>•</span>
                <a href="https://discord.gg/smartchoice" className="text-blue-600 hover:underline">
                  Discord Community
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Join SmartChoice AI Beta
          </h1>
          <p className="text-xl text-gray-600">
            Be among the first to experience AI-powered shopping intelligence
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Step {step} of 3</span>
            <span>{Math.round((step / 3) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {step === 1 && (
            <div>
              <div className="flex items-center mb-6">
                <UserGroupIcon className="w-8 h-8 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Tell us about yourself</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={betaUser.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={betaUser.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What type of shopper are you? *
                  </label>
                  <select
                    value={betaUser.userType}
                    onChange={(e) => handleInputChange('userType', e.target.value as BetaUser['userType'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="consumer">Regular Consumer</option>
                    <option value="power_shopper">Power Shopper (research extensively)</option>
                    <option value="professional">Professional Buyer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setStep(2)}
                  disabled={!betaUser.name || !betaUser.email}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center mb-6">
                <ChartBarIcon className="w-8 h-8 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">What interests you?</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                Select the categories you shop for most often (select all that apply):
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => handleInterestToggle(interest)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      betaUser.interests.includes(interest)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center ${
                        betaUser.interests.includes(interest)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {betaUser.interests.includes(interest) && (
                          <CheckCircleIcon className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{interest}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Next
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex items-center mb-6">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Help us improve</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                What would you most like to see in an AI shopping assistant? Your feedback will help shape the product.
              </p>

              <textarea
                value={betaUser.feedback}
                onChange={(e) => handleInputChange('feedback', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about your shopping challenges, what features excite you, or any specific needs you have..."
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h3 className="font-medium text-blue-900 mb-2">What to expect as a beta user:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Early access to new features</li>
                  <li>• Direct line to our development team</li>
                  <li>• Opportunity to shape the product roadmap</li>
                  <li>• Weekly product updates and improvements</li>
                  <li>• Exclusive beta user community access</li>
                </ul>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Join Beta'}
                  {!isSubmitting && <ArrowRightIcon className="w-4 h-4 ml-2" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Support Links */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Questions about the beta program?</p>
          <div className="flex justify-center space-x-4 mt-2">
            <a href="mailto:beta@smartchoice.ai" className="text-blue-600 hover:underline">
              Email Support
            </a>
            <span>•</span>
            <a href="/beta/guidelines" className="text-blue-600 hover:underline">
              Beta Guidelines
            </a>
            <span>•</span>
            <a href="https://discord.gg/smartchoice" className="text-blue-600 hover:underline">
              Discord Community
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}