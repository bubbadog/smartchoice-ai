#!/bin/bash

# Smart GitHub Project Sync Script for SmartChoice AI MVP
# This script reads from project-config.json and syncs with GitHub

set -e

# Load configuration
CONFIG_FILE="project-config.json"
SYNC_FILE=".github-sync-state.json"

# Check dependencies
if ! command -v jq &> /dev/null; then
    echo "❌ jq is required. Install with: brew install jq"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI is required. Install from: https://cli.github.com/"
    exit 1
fi

if [[ ! -f $CONFIG_FILE ]]; then
    echo "❌ $CONFIG_FILE not found. Please create it first."
    exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load config
REPO_OWNER=$(jq -r '.project.repo_owner' $CONFIG_FILE)
REPO_NAME=$(jq -r '.project.repo_name' $CONFIG_FILE)

echo -e "${GREEN}🔄 SmartChoice AI MVP - Smart Project Sync${NC}"
echo -e "${BLUE}📁 Repository: $REPO_OWNER/$REPO_NAME${NC}"

# Function to get existing issues
get_existing_issues() {
    echo -e "${YELLOW}📋 Fetching existing issues...${NC}"
    gh issue list --repo $REPO_OWNER/$REPO_NAME --state all --json number,title,labels,body --limit 1000 > existing_issues.json 2>/dev/null || echo "[]" > existing_issues.json
}

# Function to create sync state file
init_sync_state() {
    if [[ ! -f $SYNC_FILE ]]; then
        echo '{"synced_issues": {}, "last_sync": "", "version": "1.0"}' > $SYNC_FILE
        echo -e "${BLUE}📝 Created sync state file${NC}"
    fi
}

# Function to check if issue exists
check_issue_exists() {
    local issue_title="$1"
    jq -r ".[] | select(.title == \"$issue_title\") | .number" existing_issues.json 2>/dev/null | head -1
}

# Function to calculate content hash
calculate_issue_hash() {
    local content="$1"
    echo -n "$content" | shasum -a 256 | cut -d' ' -f1
}

# Function to update sync state
update_sync_state() {
    local issue_number="$1"
    local issue_hash="$2"
    local action="$3"
    
    jq --arg num "$issue_number" --arg hash "$issue_hash" --arg action "$action" --arg timestamp "$(date -Iseconds)" \
       '.synced_issues[$num] = {hash: $hash, action: $action, last_updated: $timestamp} | .last_sync = $timestamp' \
       $SYNC_FILE > temp_sync.json && mv temp_sync.json $SYNC_FILE
}

# Function to create labels
setup_labels() {
    echo -e "${YELLOW}🏷️ Setting up labels...${NC}"
    
    jq -r '.labels[] | "\(.name):\(.color):\(.description)"' $CONFIG_FILE | while IFS=':' read -r name color description; do
        gh label create "$name" --color "$color" --description "$description" --repo $REPO_OWNER/$REPO_NAME 2>/dev/null || true
    done
}

# Function to create milestones
setup_milestones() {
    echo -e "${YELLOW}🎯 Setting up milestones...${NC}"
    
    jq -r '.milestones[] | "\(.title)|\(.description)|\(.due_days)"' $CONFIG_FILE | while IFS='|' read -r title description due_days; do
        local due_date=$(date -d "+${due_days} days" -Iseconds 2>/dev/null || date -v +${due_days}d -Iseconds)
        gh api repos/$REPO_OWNER/$REPO_NAME/milestones -f title="$title" -f description="$description" -f due_on="$due_date" 2>/dev/null || true
    done
}

# All 35 issues data
sync_all_issues() {
    echo -e "${YELLOW}📝 Syncing all issues...${NC}"
    
    # Issue 001
    sync_single_issue "001" "Initialize Monorepo Structure" "P0 (Blocker)" "2 hours" "P0,setup,infrastructure" \
    "Set up the complete monorepo structure with workspaces and build tools." \
    "- [ ] Create root package.json with workspaces configuration
- [ ] Set up Turbo for monorepo management
- [ ] Create folder structure (apps/, packages/, tools/)
- [ ] Configure TypeScript root config with path mapping
- [ ] Set up ESLint and Prettier configurations
- [ ] Create .gitignore and environment files" \
    "- \`pnpm install\` runs successfully from root
- All workspaces are properly linked
- TypeScript compilation works across packages
- Linting and formatting rules are enforced" \
    "None"

    # Issue 002
    sync_single_issue "002" "Environment Configuration" "P0 (Blocker)" "1 hour" "P0,setup,infrastructure" \
    "Configure environment variables and secrets management." \
    "- [ ] Create .env.example with all required variables
- [ ] Set up environment validation with Zod
- [ ] Configure different environments (dev, staging, prod)
- [ ] Document API key requirements and setup process" \
    "- Environment variables are validated on startup
- Clear documentation for obtaining API keys
- Secure handling of secrets in all environments" \
    "#001"

    # Issue 003
    sync_single_issue "003" "Database Setup & Schema" "P0 (Blocker)" "3 hours" "P0,setup,infrastructure" \
    "Set up PostgreSQL database with Drizzle ORM and initial schema." \
    "- [ ] Install and configure Drizzle ORM
- [ ] Create database schema for products, users, searches
- [ ] Set up migration system
- [ ] Create database connection utility
- [ ] Add database seeding for development" \
    "- Database schema matches PRD requirements
- Migrations run successfully
- Connection pooling is configured
- Development seed data is available" \
    "#002"

    # Issue 004
    sync_single_issue "004" "TypeScript Type Definitions" "P0 (Blocker)" "2 hours" "P0,setup,backend,frontend" \
    "Create comprehensive TypeScript types for the entire application." \
    "- [ ] Define Product, Review, User interfaces with Zod schemas
- [ ] Create API response types and pagination interfaces
- [ ] Set up search filters and recommendation types
- [ ] Export all types from shared package
- [ ] Add runtime validation helpers" \
    "- All types are properly validated with Zod
- Types are shared across frontend and backend
- Runtime validation prevents invalid data
- Documentation includes type examples" \
    "#001"

    # Issue 005
    sync_single_issue "005" "Utility Functions Package" "P1" "2 hours" "P1,setup,backend,frontend" \
    "Create shared utility functions used across the application." \
    "- [ ] Price formatting and currency utilities
- [ ] Date/time formatting helpers
- [ ] String manipulation (slugs, truncation)
- [ ] Validation helpers and sanitization
- [ ] Error handling utilities" \
    "- Utilities work consistently across frontend/backend
- Proper error handling for edge cases
- Unit tests for all utility functions
- Clear JSDoc documentation" \
    "#004"

    # Issue 006
    sync_single_issue "006" "Express.js API Server Setup" "P0 (Critical)" "3 hours" "P0,backend,api,setup" \
    "Set up Express.js server with middleware and basic routing." \
    "- [ ] Initialize Express app with TypeScript
- [ ] Configure CORS, helmet, rate limiting
- [ ] Set up request/response logging
- [ ] Create health check endpoint
- [ ] Add error handling middleware
- [ ] Configure request validation middleware" \
    "- Server starts without errors
- Health check returns proper status
- All middleware is properly configured
- Request/response logging works
- Error responses are standardized" \
    "#003, #004"

    # Issue 007
    sync_single_issue "007" "Authentication System" "P1" "4 hours" "P1,backend,api" \
    "Implement user authentication with JWT tokens." \
    "- [ ] Create user registration endpoint
- [ ] Implement login/logout functionality
- [ ] Set up JWT token generation and validation
- [ ] Create auth middleware for protected routes
- [ ] Add password hashing with bcrypt
- [ ] Implement refresh token mechanism" \
    "- Users can register and login successfully
- JWT tokens are properly validated
- Protected routes require authentication
- Passwords are securely hashed
- Refresh tokens work correctly" \
    "#006"

    # Issue 008
    sync_single_issue "008" "Product Search API Endpoints" "P0 (Critical)" "5 hours" "P0,backend,api" \
    "Create API endpoints for product search and retrieval." \
    "- [ ] POST /api/search - Natural language product search
- [ ] GET /api/products/:id - Get product details
- [ ] GET /api/products/similar/:id - Find similar products
- [ ] POST /api/products/compare - Compare multiple products
- [ ] Add input validation and sanitization
- [ ] Implement search result caching" \
    "- All endpoints return proper JSON responses
- Input validation prevents invalid requests
- Error handling for missing products
- Response times under 2 seconds
- Proper HTTP status codes" \
    "#006, #004"

    # Issue 009
    sync_single_issue "009" "User Preferences API" "P1" "3 hours" "P1,backend,api" \
    "API endpoints for managing user preferences and search history." \
    "- [ ] GET /api/users/preferences - Get user preferences
- [ ] PUT /api/users/preferences - Update preferences
- [ ] GET /api/users/history - Get search history
- [ ] POST /api/users/interactions - Track user interactions
- [ ] Add preference validation and defaults" \
    "- User preferences persist correctly
- Search history is properly tracked
- Privacy controls for data retention
- Preferences affect recommendations" \
    "#007, #008"

    # Issue 010
    sync_single_issue "010" "MCP Server Base Framework" "P0 (Critical)" "4 hours" "P0,mcp,ai,infrastructure" \
    "Create the foundational MCP server framework and lifecycle management." \
    "- [ ] Implement abstract MCPServer base class
- [ ] Create server lifecycle management (start/stop/health)
- [ ] Add event emission for server status changes
- [ ] Implement graceful shutdown handling
- [ ] Create server registry and management system" \
    "- Base MCP server class is fully functional
- Servers can be started/stopped independently
- Health checks work for all servers
- Graceful shutdown prevents data loss
- Server status is properly tracked" \
    "#004"

    # Issue 011
    sync_single_issue "011" "Product Search MCP Server" "P0 (Critical)" "6 hours" "P0,mcp,ai" \
    "Implement the core product search MCP server with AI integration." \
    "- [ ] Create ProductSearchServer class
- [ ] Integrate OpenAI GPT-4 for query parsing
- [ ] Implement natural language to structured query conversion
- [ ] Add product deduplication logic
- [ ] Create search result ranking algorithm
- [ ] Add caching for repeated searches" \
    "- Natural language queries are properly parsed
- Search results are relevant and ranked
- Duplicate products are filtered out
- Response time under 3 seconds
- Caching improves performance" \
    "#010"

    # Issue 012
    sync_single_issue "012" "Amazon Product API Integration" "P0 (Critical)" "5 hours" "P0,api,integration" \
    "Integrate Amazon Product Advertising API for product data." \
    "- [ ] Set up Amazon Product Advertising API client
- [ ] Implement product search functionality
- [ ] Add product detail retrieval
- [ ] Create price and availability tracking
- [ ] Handle API rate limits and errors
- [ ] Map Amazon data to internal product schema" \
    "- Amazon API integration works reliably
- Product data is properly normalized
- Rate limits are respected
- Error handling for API failures
- Affiliate links are properly generated" \
    "#011"

    # Issue 013
    sync_single_issue "013" "Best Buy API Integration" "P0 (Critical)" "4 hours" "P0,api,integration" \
    "Integrate Best Buy API for additional product coverage." \
    "- [ ] Set up Best Buy API client
- [ ] Implement product search and details
- [ ] Add inventory and pricing data
- [ ] Create store availability checking
- [ ] Handle API errors and fallbacks
- [ ] Map Best Buy data to internal schema" \
    "- Best Buy API integration works correctly
- Store availability is accurate
- Price data is up-to-date
- Proper error handling and fallbacks
- Data mapping is consistent" \
    "#012"

    # Issue 014
    sync_single_issue "014" "Review Analysis MCP Server" "P1" "5 hours" "P1,mcp,ai" \
    "Create MCP server for AI-powered review analysis and summarization." \
    "- [ ] Create ReviewAnalysisServer class
- [ ] Implement web scraping for Amazon reviews
- [ ] Add OpenAI integration for review summarization
- [ ] Create pros/cons extraction algorithm
- [ ] Implement sentiment analysis
- [ ] Add review authenticity scoring" \
    "- Reviews are properly scraped and parsed
- AI summaries are accurate and helpful
- Pros/cons are clearly identified
- Sentiment analysis is reliable
- Authenticity scores help filter fake reviews" \
    "#010, #011"

    # Issue 015
    sync_single_issue "015" "Price Intelligence MCP Server" "P1" "4 hours" "P1,mcp,ai" \
    "Implement price tracking and deal scoring functionality." \
    "- [ ] Create PriceIntelligenceServer class
- [ ] Implement price history tracking
- [ ] Add deal score calculation algorithm
- [ ] Create price prediction models
- [ ] Implement price drop alerts
- [ ] Add competitor price comparison" \
    "- Price history is accurately tracked
- Deal scores reflect actual value
- Price predictions are reasonable
- Alerts work for price drops
- Competitor comparison is fair" \
    "#010, #012, #013"

    # Issue 016
    sync_single_issue "016" "Next.js App Setup with Mobile-First Design" "P0 (Critical)" "3 hours" "P0,frontend,mobile,setup" \
    "Set up Next.js application with mobile-first responsive design system." \
    "- [ ] Initialize Next.js 14 with App Router
- [ ] Configure Tailwind CSS with mobile-first breakpoints
- [ ] Set up responsive design tokens and utilities
- [ ] Create base layout components
- [ ] Configure PWA capabilities
- [ ] Set up font optimization and loading" \
    "- App builds and runs without errors
- Responsive design system is consistent
- PWA manifest and service worker configured
- Performance scores 90+ on mobile
- Typography and spacing scales properly" \
    "#004"

    # Issue 017
    sync_single_issue "017" "Responsive Component Library" "P0 (Critical)" "6 hours" "P0,frontend,mobile" \
    "Create reusable UI components optimized for mobile and desktop." \
    "- [ ] Button component with touch-friendly sizing
- [ ] Input and form components with mobile optimization
- [ ] Card and list components for product display
- [ ] Modal and drawer components for mobile
- [ ] Loading states and skeleton components
- [ ] Toast notification system" \
    "- All components work on mobile and desktop
- Touch targets meet accessibility guidelines (44px min)
- Components are properly typed with TypeScript
- Storybook documentation (optional)
- Consistent design system implementation" \
    "#016"

    # Issue 018
    sync_single_issue "018" "Product Search Interface" "P0 (Critical)" "5 hours" "P0,frontend,mobile" \
    "Create the main product search interface with mobile optimization." \
    "- [ ] Natural language search input with autocomplete
- [ ] Search filters with mobile-friendly design
- [ ] Search suggestions and recent searches
- [ ] Voice search integration (optional)
- [ ] Search history and saved searches
- [ ] Empty state and error handling" \
    "- Search input works on all devices
- Filters are easily accessible on mobile
- Voice search works in supported browsers
- Search suggestions improve user experience
- Error states are user-friendly" \
    "#017, #008"

    # Issue 019
    sync_single_issue "019" "Product Recommendation Display" "P0 (Critical)" "6 hours" "P0,frontend,mobile" \
    "Create responsive product recommendation cards and list views." \
    "- [ ] Product card component with all key information
- [ ] Responsive grid layout for recommendations
- [ ] Swipe gestures for mobile product comparison
- [ ] Confidence score visualization
- [ ] Deal score and pricing display
- [ ] Quick action buttons (save, compare, buy)" \
    "- Product cards display all essential information
- Swipe gestures work smoothly on mobile
- Confidence and deal scores are clear
- Quick actions are easily accessible
- Performance with large product lists" \
    "#017, #008"

    # Issue 020
    sync_single_issue "020" "Product Comparison Interface" "P1" "5 hours" "P1,frontend,mobile" \
    "Create side-by-side product comparison with mobile optimization." \
    "- [ ] Responsive comparison table/cards
- [ ] Feature-by-feature comparison
- [ ] Price comparison across retailers
- [ ] Pros/cons comparison display
- [ ] Mobile-optimized swipe navigation
- [ ] Add/remove products from comparison" \
    "- Comparison works well on mobile and desktop
- Feature comparison is clear and helpful
- Price comparison is accurate and up-to-date
- Mobile navigation is intuitive
- Users can easily modify comparison" \
    "#019, #014"

    # Issue 021
    sync_single_issue "021" "User Dashboard & Preferences" "P1" "4 hours" "P1,frontend,mobile" \
    "Create user dashboard for preferences and search history." \
    "- [ ] User preferences form with mobile design
- [ ] Search history with filtering and search
- [ ] Saved products and price alerts
- [ ] Account settings and privacy controls
- [ ] Mobile-friendly navigation and layout" \
    "- Dashboard is fully responsive
- Preferences save and apply correctly
- Search history is searchable and filterable
- Price alerts are clearly displayed
- Privacy controls are comprehensive" \
    "#017, #009"

    # Issue 022
    sync_single_issue "022" "PWA Implementation" "P1" "3 hours" "P1,frontend,mobile" \
    "Implement Progressive Web App features for mobile app-like experience." \
    "- [ ] Configure PWA manifest and icons
- [ ] Implement service worker for caching
- [ ] Add offline functionality for saved products
- [ ] Create \"Add to Home Screen\" prompt
- [ ] Implement push notifications for price alerts
- [ ] Add app-like navigation and gestures" \
    "- App can be installed on mobile devices
- Works offline with saved content
- Push notifications work correctly
- App feels native on mobile
- Lighthouse PWA score 90+" \
    "#016, #021"

    # Issue 023
    sync_single_issue "023" "Frontend-Backend API Integration" "P0 (Critical)" "4 hours" "P0,integration,frontend" \
    "Connect frontend components to backend API endpoints." \
    "- [ ] Set up API client with error handling
- [ ] Implement search API integration
- [ ] Add user authentication flow
- [ ] Create data fetching hooks for React
- [ ] Implement caching with React Query
- [ ] Add loading states and error boundaries" \
    "- All API calls work correctly
- Error handling provides user feedback
- Loading states improve user experience
- Caching reduces unnecessary requests
- Authentication flow is seamless" \
    "#018, #019, #008"

    # Issue 024
    sync_single_issue "024" "Real-time Price Updates" "P2" "3 hours" "P2,integration,frontend" \
    "Implement real-time price updates and notifications." \
    "- [ ] WebSocket connection for price updates
- [ ] Real-time notification system
- [ ] Price change animations and indicators
- [ ] Background price monitoring
- [ ] Alert management interface" \
    "- Price updates appear in real-time
- Notifications are timely and relevant
- UI updates smoothly without jarring changes
- Background monitoring doesn't impact performance
- Users can manage their alerts" \
    "#015, #022"

    # Issue 025
    sync_single_issue "025" "Backend API Testing" "P1" "4 hours" "P1,testing,backend" \
    "Create comprehensive test suite for backend APIs." \
    "- [ ] Set up Jest testing framework
- [ ] Create unit tests for all API endpoints
- [ ] Add integration tests for MCP servers
- [ ] Implement database testing with test fixtures
- [ ] Add API contract testing
- [ ] Create performance benchmarks" \
    "- All API endpoints have test coverage
- Tests run in CI/CD pipeline
- Database tests use isolated test data
- Performance tests catch regressions
- Test coverage above 80%" \
    "#008, #011, #014, #015"

    # Issue 026
    sync_single_issue "026" "Frontend Component Testing" "P1" "3 hours" "P1,testing,frontend" \
    "Create test suite for React components and user interactions." \
    "- [ ] Set up React Testing Library
- [ ] Create unit tests for all components
- [ ] Add integration tests for user flows
- [ ] Implement visual regression testing
- [ ] Add accessibility testing with jest-axe
- [ ] Create mobile-specific interaction tests" \
    "- All components have test coverage
- User flows are tested end-to-end
- Accessibility standards are enforced
- Mobile interactions are tested
- Tests catch UI regressions" \
    "#017, #018, #019"

    # Issue 027
    sync_single_issue "027" "Mobile Device Testing" "P1" "2 hours" "P1,testing,mobile" \
    "Test application across different mobile devices and browsers." \
    "- [ ] Test on iOS Safari and Chrome
- [ ] Test on Android Chrome and Samsung Browser
- [ ] Verify touch interactions and gestures
- [ ] Test PWA installation and functionality
- [ ] Check performance on older devices
- [ ] Verify responsive breakpoints" \
    "- App works on all major mobile browsers
- Touch interactions feel natural
- PWA installs and works correctly
- Performance is acceptable on older devices
- Design works at all screen sizes" \
    "#022, #019"

    # Issue 028
    sync_single_issue "028" "CI/CD Pipeline Setup" "P1" "3 hours" "P1,deployment,infrastructure" \
    "Set up automated build, test, and deployment pipeline." \
    "- [ ] Configure GitHub Actions workflow
- [ ] Set up automated testing on PR
- [ ] Create staging and production environments
- [ ] Add automated security scanning
- [ ] Configure environment variable management
- [ ] Set up deployment notifications" \
    "- Code changes trigger automated tests
- Staging deploys work automatically
- Production deploys require approval
- Security scans catch vulnerabilities
- Team gets deployment notifications" \
    "#025, #026"

    # Issue 029
    sync_single_issue "029" "Production Deployment" "P1" "4 hours" "P1,deployment,infrastructure" \
    "Deploy application to production with monitoring and scaling." \
    "- [ ] Deploy frontend to Vercel with CDN
- [ ] Deploy backend to Railway with auto-scaling
- [ ] Set up PostgreSQL database with backups
- [ ] Configure domain and SSL certificates
- [ ] Add error monitoring with Sentry
- [ ] Set up analytics and performance monitoring" \
    "- Application is accessible at custom domain
- SSL certificates are properly configured
- Database backups run automatically
- Error monitoring catches issues
- Performance monitoring tracks metrics" \
    "#028"

    # Issue 030
    sync_single_issue "030" "Environment Monitoring" "P2" "2 hours" "P2,deployment,infrastructure" \
    "Set up comprehensive monitoring and alerting for production." \
    "- [ ] Configure uptime monitoring
- [ ] Set up performance alerting
- [ ] Add database performance monitoring
- [ ] Create custom dashboard for key metrics
- [ ] Set up log aggregation and searching
- [ ] Configure alert notifications" \
    "- Downtime is detected and reported quickly
- Performance regressions trigger alerts
- Database issues are monitored
- Key metrics are easily visible
- Logs are searchable and useful" \
    "#029"

    # Issue 031
    sync_single_issue "031" "API Documentation" "P2" "2 hours" "P2,documentation" \
    "Create comprehensive API documentation for all endpoints." \
    "- [ ] Generate OpenAPI/Swagger documentation
- [ ] Add example requests and responses
- [ ] Document authentication requirements
- [ ] Create integration guides
- [ ] Add rate limiting documentation" \
    "- All endpoints are documented
- Examples work correctly
- Authentication is clearly explained
- Integration guides are helpful
- Documentation is up-to-date" \
    "#008, #009"

    # Issue 032
    sync_single_issue "032" "User Documentation" "P2" "2 hours" "P2,documentation" \
    "Create user guides and help documentation." \
    "- [ ] Create getting started guide
- [ ] Document mobile app installation
- [ ] Add feature tutorials and tips
- [ ] Create FAQ section
- [ ] Add troubleshooting guide" \
    "- New users can get started easily
- Mobile installation is clearly explained
- Features are well documented
- Common issues are addressed
- Help is easily accessible" \
    "#022"

    # Issue 033
    sync_single_issue "033" "Performance Optimization" "P2" "3 hours" "P2,frontend,backend" \
    "Optimize application performance for mobile and desktop." \
    "- [ ] Optimize image loading and compression
- [ ] Implement code splitting and lazy loading
- [ ] Optimize API response caching
- [ ] Minimize bundle sizes
- [ ] Optimize database queries
- [ ] Add performance monitoring" \
    "- Mobile performance scores 90+ on Lighthouse
- Page load times under 2 seconds
- Bundle sizes are minimized
- Database queries are optimized
- Performance regressions are prevented" \
    "#023, #029"

    # Issue 034
    sync_single_issue "034" "Security Audit" "P1" "2 hours" "P1,backend,frontend" \
    "Conduct security review and implement necessary fixes." \
    "- [ ] Review authentication and authorization
- [ ] Audit API endpoints for security issues
- [ ] Check for common vulnerabilities (OWASP)
- [ ] Review data handling and privacy
- [ ] Implement security headers and CSP
- [ ] Add input validation and sanitization" \
    "- No critical security vulnerabilities
- Authentication is secure
- Data handling follows best practices
- Security headers are properly configured
- Input validation prevents attacks" \
    "#007, #008"

    # Issue 035
    sync_single_issue "035" "Beta Launch Preparation" "P0 (Critical)" "2 hours" "P0,documentation" \
    "Prepare for beta launch with initial users." \
    "- [ ] Create beta user onboarding flow
- [ ] Set up user feedback collection
- [ ] Prepare launch announcement
- [ ] Create beta testing guidelines
- [ ] Set up user support channels
- [ ] Prepare usage analytics tracking" \
    "- Beta users can easily get started
- Feedback collection is working
- Support channels are ready
- Analytics track key metrics
- Launch materials are prepared" \
    "#032, #029"
    
    echo -e "${GREEN}✅ All 35 issues synced!${NC}"
}

# Function to sync a single issue
sync_single_issue() {
    local number=$1
    local title=$2
    local priority=$3
    local estimate=$4
    local labels=$5
    local description=$6
    local tasks=$7
    local acceptance=$8
    local dependencies=$9
    
    local full_title="#$number: $title"
    local content="$title$description$tasks$acceptance"
    local current_hash=$(calculate_issue_hash "$content")
    local stored_hash=$(jq -r ".synced_issues[\"$number\"].hash // \"\"" $SYNC_FILE 2>/dev/null)
    
    local body="**Priority**: $priority
**Estimate**: $estimate

**Description**: $description

**Tasks**:
$tasks

**Acceptance Criteria**:
$acceptance

**Dependencies**: $dependencies

---
*Auto-synced on $(date)*"

    local existing_issue=$(check_issue_exists "$full_title")
    local issue_labels_array=($(echo $labels | tr ',' ' '))
    
    if [[ -n "$existing_issue" ]]; then
        if [[ "$current_hash" != "$stored_hash" ]]; then
            echo -e "${YELLOW}🔄 Updating issue #$number: $title${NC}"
            gh issue edit $existing_issue --repo $REPO_OWNER/$REPO_NAME --body "$body" 2>/dev/null || echo "Update failed for #$number"
            update_sync_state "$number" "$current_hash" "updated"
        else
            echo -e "${BLUE}✅ Issue #$number: $title (no changes)${NC}"
        fi
    else
        echo -e "${GREEN}📝 Creating new issue #$number: $title${NC}"
        # Build the gh command with multiple --label arguments
        local label_args=""
        for label in "${issue_labels_array[@]}"; do
            label_args="$label_args --label $label"
        done
        gh issue create --repo $REPO_OWNER/$REPO_NAME \
            --title "$full_title" \
            --body "$body" \
            $label_args 2>&1 || echo "Failed to create #$number"
        update_sync_state "$number" "$current_hash" "created"
    fi
}

# Function to show summary
show_summary() {
    if [[ ! -f $SYNC_FILE ]]; then
        echo "No sync state found."
        return
    fi
    
    echo -e "\n${GREEN}📊 Sync Summary:${NC}"
    local created=$(jq -r '.synced_issues | to_entries[] | select(.value.action == "created") | .key' $SYNC_FILE 2>/dev/null | wc -l)
    local updated=$(jq -r '.synced_issues | to_entries[] | select(.value.action == "updated") | .key' $SYNC_FILE 2>/dev/null | wc -l)
    local total=$(jq -r '.synced_issues | length' $SYNC_FILE 2>/dev/null)
    
    echo "  Created: $created issues"
    echo "  Updated: $updated issues"
    echo "  Total managed: $total issues"
    echo -e "  Repository: https://github.com/$REPO_OWNER/$REPO_NAME/issues"
}

# Main function
main() {
    init_sync_state
    get_existing_issues
    setup_labels
    setup_milestones
    sync_all_issues
    show_summary
    
    # Cleanup
    rm -f existing_issues.json
}

# Command handling
case "${1:-sync}" in
    "sync")
        main
        ;;
    "status")
        show_summary
        ;;
    "reset")
        echo -e "${YELLOW}🗑️ Resetting sync state...${NC}"
        rm -f $SYNC_FILE
        echo "Sync state reset."
        ;;
    *)
        echo "Usage: $0 {sync|status|reset}"
        exit 1
        ;;
esac