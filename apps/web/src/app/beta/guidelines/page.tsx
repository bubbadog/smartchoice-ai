import { CheckCircleIcon, ExclamationTriangleIcon, ChatBubbleLeftRightIcon, BugAntIcon } from '@heroicons/react/24/outline'

export default function BetaGuidelines() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            SmartChoice AI Beta Testing Guidelines
          </h1>
          <p className="text-xl text-gray-600">
            Help us build the future of AI-powered shopping
          </p>
        </div>

        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-center mb-6">
            <CheckCircleIcon className="w-8 h-8 text-green-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Welcome to the Beta Program!</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            As a beta tester, you're helping shape SmartChoice AI before its public launch. 
            Your feedback is invaluable in creating the best possible shopping experience.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-2">2-4 weeks</div>
              <div className="text-sm text-gray-600">Beta Duration</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-2">24-48h</div>
              <div className="text-sm text-gray-600">Response Time</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-2">500+</div>
              <div className="text-sm text-gray-600">Beta Testers</div>
            </div>
          </div>
        </div>

        {/* What to Test */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What to Test</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Features</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Natural Language Search</strong>
                    <p className="text-sm text-gray-600">Try searches like "wireless headphones under $200" or "eco-friendly kitchen appliances"</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>AI Recommendations</strong>
                    <p className="text-sm text-gray-600">Test the confidence scores and deal intelligence</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Product Comparison</strong>
                    <p className="text-sm text-gray-600">Compare similar products and evaluate the insights</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Mobile Experience</strong>
                    <p className="text-sm text-gray-600">Test on different devices and screen sizes</p>
                  </div>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Scenarios</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Scenario 1: Gift Shopping</h4>
                  <p className="text-sm text-blue-700">Search for gifts for different age groups and budgets</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Scenario 2: Home Upgrade</h4>
                  <p className="text-sm text-green-700">Find items for specific rooms or home improvement projects</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900">Scenario 3: Hobby Shopping</h4>
                  <p className="text-sm text-purple-700">Search for specialized equipment or supplies for hobbies</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-orange-900">Scenario 4: Price Comparison</h4>
                  <p className="text-sm text-orange-700">Compare the same product across different retailers</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How to Provide Feedback */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-center mb-6">
            <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">How to Provide Feedback</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 border-2 border-blue-200 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BugAntIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Bug Reports</h3>
              <p className="text-sm text-gray-600 mb-4">Found something broken?</p>
              <a 
                href="mailto:bugs@smartchoice.ai?subject=Beta%20Bug%20Report"
                className="text-blue-600 hover:underline text-sm"
              >
                bugs@smartchoice.ai
              </a>
            </div>

            <div className="text-center p-6 border-2 border-green-200 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">General Feedback</h3>
              <p className="text-sm text-gray-600 mb-4">Share your thoughts</p>
              <a 
                href="mailto:feedback@smartchoice.ai?subject=Beta%20Feedback"
                className="text-green-600 hover:underline text-sm"
              >
                feedback@smartchoice.ai
              </a>
            </div>

            <div className="text-center p-6 border-2 border-purple-200 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Live Discussion</h3>
              <p className="text-sm text-gray-600 mb-4">Join the community</p>
              <a 
                href="https://discord.gg/smartchoice"
                className="text-purple-600 hover:underline text-sm"
              >
                Discord Server
              </a>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-3">When reporting issues, please include:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Device and browser information</li>
              <li>• Steps to reproduce the issue</li>
              <li>• Screenshots or screen recordings if applicable</li>
              <li>• Search queries that didn't work as expected</li>
              <li>• Any error messages you saw</li>
            </ul>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="flex items-center mb-6">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">Important Notes</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                <span className="text-amber-600 text-sm font-bold">!</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Beta Software Limitations</h3>
                <p className="text-gray-600">
                  This is beta software and may contain bugs or incomplete features. 
                  Please don't rely on it for critical purchasing decisions.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                <span className="text-blue-600 text-sm font-bold">?</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Data and Privacy</h3>
                <p className="text-gray-600">
                  We collect usage data and feedback to improve the product. 
                  All data is handled according to our privacy policy and will be deleted after the beta period.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                <span className="text-green-600 text-sm font-bold">✓</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Updates and Changes</h3>
                <p className="text-gray-600">
                  We'll release updates frequently during the beta period. 
                  You'll be notified of major changes via email.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Questions?</h2>
          <p className="text-gray-600 mb-6">
            Our beta support team is here to help you succeed.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="mailto:beta@smartchoice.ai"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Email Beta Support
            </a>
            <a 
              href="https://discord.gg/smartchoice"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Join Discord
            </a>
            <a 
              href="/"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back to App
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}