#!/bin/bash

# Modular GitHub Project Sync Script
# Loads issues from external files and preserves progress

set -e

# Configuration files
PROJECT_CONFIG="project-config.json"
ISSUES_DATA="issues-data.json"
SYNC_FILE=".github-sync-state.json"
BACKUP_DIR=".github-backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Check dependencies
check_dependencies() {
    local missing=()
    
    if ! command -v jq &> /dev/null; then
        missing+=("jq")
    fi
    
    if ! command -v gh &> /dev/null; then
        missing+=("gh")
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo -e "${RED}❌ Missing dependencies: ${missing[*]}${NC}"
        echo "Install with: brew install ${missing[*]}"
        exit 1
    fi
}

# Load and validate config
load_config() {
    # Check project config
    if [[ ! -f $PROJECT_CONFIG ]]; then
        echo -e "${RED}❌ $PROJECT_CONFIG not found${NC}"
        exit 1
    fi
    
    # Check issues data
    if [[ ! -f $ISSUES_DATA ]]; then
        echo -e "${YELLOW}⚠️  $ISSUES_DATA not found, will use basic template${NC}"
        create_basic_issues_template
    fi
    
    REPO_OWNER=$(jq -r '.project.repo_owner' $PROJECT_CONFIG)
    REPO_NAME=$(jq -r '.project.repo_name' $PROJECT_CONFIG)
    
    if [[ "$REPO_OWNER" == "null" || "$REPO_NAME" == "null" ]]; then
        echo -e "${RED}❌ Invalid config: repo_owner and repo_name required${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}📁 Loaded config: $REPO_OWNER/$REPO_NAME${NC}"
}

# Create basic issues template if file doesn't exist
create_basic_issues_template() {
    cat > $ISSUES_DATA << 'EOF'
{
      "version": "1.1.0",
  "last_updated": "2024-12-07",
  "total_issues": 3,
  "issues": [
    {
      "number": "001",
      "title": "Initialize Project",
      "priority": "P0 (Blocker)",
      "estimate": "2 hours",
      "labels": ["P0", "setup"],
      "milestone": "Week 1",
      "description": "Set up the basic project structure.",
      "tasks": [
        "Create project files",
        "Set up basic configuration"
      ],
      "acceptance_criteria": [
        "Project structure is created",
        "Basic setup is complete"
      ],
      "dependencies": "None"
    }
  ]
}
EOF
    echo -e "${BLUE}📝 Created basic issues template: $ISSUES_DATA${NC}"
}

# Create backup directory
init_backup() {
    mkdir -p $BACKUP_DIR
    echo -e "${BLUE}📁 Backup directory ready: $BACKUP_DIR${NC}"
}

# Backup current state before making changes
backup_current_state() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/issues_backup_$timestamp.json"
    
    echo -e "${YELLOW}💾 Creating backup...${NC}"
    gh issue list --repo $REPO_OWNER/$REPO_NAME --state all --json number,title,labels,body,state --limit 1000 > "$backup_file" 2>/dev/null || echo "[]" > "$backup_file"
    echo -e "${GREEN}✅ Backup saved: $backup_file${NC}"
}

# Extract checkbox states from existing issue
extract_checkbox_states() {
    local issue_body="$1"
    echo "$issue_body" | grep -E "^- \[([ x])\]" | sed 's/- \[\(.\)\] .*/\1/' || echo ""
}

# Preserve checkbox states when updating
preserve_checkboxes() {
    local new_tasks="$1"
    local old_body="$2"
    
    # Extract checkbox states from old body
    local checkbox_states=$(extract_checkbox_states "$old_body")
    
    # If no existing checkboxes, return new tasks as-is
    if [[ -z "$checkbox_states" ]]; then
        echo "$new_tasks"
        return
    fi
    
    # Apply old checkbox states to new tasks
    local line_num=0
    echo "$new_tasks" | while IFS= read -r line; do
        if [[ "$line" =~ ^-\ \[\ \] ]]; then
            line_num=$((line_num + 1))
            local state=$(echo "$checkbox_states" | sed -n "${line_num}p")
            if [[ "$state" == "x" ]]; then
                echo "${line/\[ \]/\[x\]}"
            else
                echo "$line"
            fi
        else
            echo "$line"
        fi
    done
}

# Get existing issue with full body
get_existing_issue() {
    local issue_title="$1"
    gh issue list --repo $REPO_OWNER/$REPO_NAME --state all --json number,title,body --limit 1000 | \
    jq -r ".[] | select(.title == \"$issue_title\") | \"\(.number)\\n---BODY-SEPARATOR---\\n\(.body)\""
}

# Enhanced sync function that preserves progress
sync_issue_safe() {
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
    
    # Get the status from issues-data.json for this issue FIRST
    local issue_status=$(jq -r ".issues[] | select(.number == \"$number\") | .status // \"\"" $ISSUES_DATA)
    
    # Include status, priority, estimate, and labels in hash to detect changes in these fields
    local content="$title$description$tasks$acceptance$issue_status$priority$estimate$labels"
    local current_hash=$(echo -n "$content" | shasum -a 256 | cut -d' ' -f1)
    local stored_hash=$(jq -r ".synced_issues[\"$number\"].hash // \"\"" $SYNC_FILE 2>/dev/null)
    local stored_status=$(jq -r ".synced_issues[\"$number\"].status // \"\"" $SYNC_FILE 2>/dev/null)
    
    # Get existing issue info
    local existing_info=$(get_existing_issue "$full_title")
    local existing_number=""
    local existing_body=""
    
    if [[ -n "$existing_info" ]]; then
        existing_number=$(echo "$existing_info" | head -n1)
        existing_body=$(echo "$existing_info" | tail -n +3)
        
    fi
    
    # Use tasks as-is since they now include proper checkbox states from issues-data.json
    local preserved_tasks="$tasks"
    
    # Format status with appropriate emoji
    local status_display=""
    case "$issue_status" in
        "completed")
            status_display="✅ **COMPLETED**"
            ;;
        "in_progress")
            status_display="🔄 **IN PROGRESS**"
            ;;
        "pending")
            status_display="⏳ **PENDING**"
            ;;
        "blocked")
            status_display="🚫 **BLOCKED**"
            ;;
        *)
            status_display="📋 **$(echo "$issue_status" | tr '[:lower:]' '[:upper:]')**"
            ;;
    esac

    local body="**Status**: $status_display
**Priority**: $priority
**Estimate**: $estimate

**Description**: $description

**Tasks**:
$preserved_tasks

**Acceptance Criteria**:
$acceptance

**Dependencies**: $dependencies

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Last synced: $(date)*"

    # Build label arguments for GitHub CLI
    local label_args=""
    if [[ -n "$labels" ]]; then
        IFS=',' read -ra LABEL_ARRAY <<< "$labels"
        for label in "${LABEL_ARRAY[@]}"; do
            label_args+="--label \"$label\" "
        done
    fi
    
    if [[ -n "$existing_number" ]]; then
        # Issue exists - check if content or status changed
        if [[ "$current_hash" != "$stored_hash" || "$issue_status" != "$stored_status" ]]; then
            echo -e "${YELLOW}🔄 Updating issue #$number: $title${NC}"
            
            # Show what would change (preview mode)
            if [[ "${DRY_RUN:-false}" == "true" ]]; then
                # Silent dry run - no extra output
                :
            else
                # Use a temporary file to avoid pipe issues
                local temp_body_file=$(mktemp)
                printf '%s\n' "$body" > "$temp_body_file"
                
                # Update issue body first
                if gh issue edit "$existing_number" --repo "$REPO_OWNER/$REPO_NAME" --body-file "$temp_body_file"; then
                    # Then update labels using GitHub API directly
                    if [[ -n "$labels" ]]; then
                        # Convert comma-separated labels to JSON array and send as raw input
                        local labels_json=$(echo "$labels" | jq -R 'split(",") | map(select(. != ""))')
                        echo "$labels_json" | gh api repos/$REPO_OWNER/$REPO_NAME/issues/$existing_number/labels \
                            --method PUT \
                            --input - >/dev/null 2>&1
                    fi
                    SYNC_SESSION_UPDATED=$((SYNC_SESSION_UPDATED + 1))
                    if [[ "$issue_status" == "completed" ]]; then
                        SYNC_SESSION_COMPLETED=$((SYNC_SESSION_COMPLETED + 1))
                    fi
                else
                    echo -e "${RED}   ❌ Update failed${NC}"
                fi
                rm "$temp_body_file"
                
                update_sync_state "$number" "$current_hash" "updated" "$issue_status"
            fi
        else
            echo -e "${BLUE}✅ Issue #$number: $title${NC}"
            SYNC_SESSION_NO_CHANGE=$((SYNC_SESSION_NO_CHANGE + 1))
        fi
    else
        # Create new issue
        echo -e "${GREEN}📝 Creating new issue #$number: $title${NC}"
        if [[ "${DRY_RUN:-false}" == "true" ]]; then
            # Silent dry run - no extra output
            :
        else
            # Use a temporary file to avoid pipe issues
            local temp_body_file=$(mktemp)
            printf '%s\n' "$body" > "$temp_body_file"
            
            # Create issue first without labels
            local new_issue_url=$(gh issue create --repo "$REPO_OWNER/$REPO_NAME" \
                --title "$full_title" \
                --body-file "$temp_body_file" 2>/dev/null)
            
            if [[ -n "$new_issue_url" ]]; then
                # Extract issue number from URL
                local new_issue_number=$(echo "$new_issue_url" | grep -o '[0-9]*$')
                
                # Add labels using GitHub API if any
                if [[ -n "$labels" ]]; then
                    local labels_json=$(echo "$labels" | jq -R 'split(",") | map(select(. != ""))')
                    echo "$labels_json" | gh api repos/$REPO_OWNER/$REPO_NAME/issues/$new_issue_number/labels \
                        --method PUT \
                        --input - >/dev/null 2>&1
                fi
                
                SYNC_SESSION_CREATED=$((SYNC_SESSION_CREATED + 1))
                if [[ "$issue_status" == "completed" ]]; then
                    SYNC_SESSION_COMPLETED=$((SYNC_SESSION_COMPLETED + 1))
                fi
            else
                echo -e "${RED}   ❌ Creation failed${NC}"
            fi
            rm "$temp_body_file"
            update_sync_state "$number" "$current_hash" "created" "$issue_status"
        fi
    fi
}

# Update sync state
update_sync_state() {
    local issue_number="$1"
    local issue_hash="$2"
    local action="$3"
    local status="$4"
    
    if [[ ! -f $SYNC_FILE ]]; then
        echo '{"synced_issues": {}, "last_sync": "", "version": "1.2"}' > $SYNC_FILE
    fi
    
    jq --arg num "$issue_number" --arg hash "$issue_hash" --arg action "$action" --arg status "$status" --arg timestamp "$(date -Iseconds)" \
       '.synced_issues[$num] = {hash: $hash, action: $action, status: $status, last_updated: $timestamp} | .last_sync = $timestamp' \
       $SYNC_FILE > temp_sync.json && mv temp_sync.json $SYNC_FILE
}

# Global counters for current sync session
SYNC_SESSION_CREATED=0
SYNC_SESSION_UPDATED=0
SYNC_SESSION_NO_CHANGE=0
SYNC_SESSION_COMPLETED=0

# Load and sync issues from external file
sync_from_issues_file() {
    local issue_count=$(jq '.issues | length' $ISSUES_DATA)
    echo -e "${YELLOW}📝 Syncing $issue_count issues from $ISSUES_DATA...${NC}"
    
    # Reset session counters
    SYNC_SESSION_CREATED=0
    SYNC_SESSION_UPDATED=0
    SYNC_SESSION_NO_CHANGE=0
    SYNC_SESSION_COMPLETED=0
    
    for i in $(seq 0 $((issue_count - 1))); do
        local issue=$(jq ".issues[$i]" $ISSUES_DATA)
        local number=$(echo "$issue" | jq -r '.number')
        local title=$(echo "$issue" | jq -r '.title')
        local priority=$(echo "$issue" | jq -r '.priority')
        local estimate=$(echo "$issue" | jq -r '.estimate')
        local labels=$(echo "$issue" | jq -r '.labels | join(",")')
        local description=$(echo "$issue" | jq -r '.description')
        local tasks=$(echo "$issue" | jq -r '.tasks[]' | while IFS= read -r task; do
            if [[ "$task" =~ ^✅ ]]; then
                echo "- [x] ${task#✅ }"
            elif [[ "$task" =~ ^🔄 ]]; then
                echo "- [ ] ${task#🔄 }"
            else
                echo "- [ ] $task"
            fi
        done | paste -sd '\n' -)
        local acceptance=$(echo "$issue" | jq -r '.acceptance_criteria[]' | while IFS= read -r criterion; do
            if [[ "$criterion" =~ ^✅ ]]; then
                echo "- [x] ${criterion#✅ }"
            elif [[ "$criterion" =~ ^🔄 ]]; then
                echo "- [ ] ${criterion#🔄 }"
            else
                echo "- $criterion"
            fi
        done | paste -sd '\n' -)
        local dependencies=$(echo "$issue" | jq -r '.dependencies')
        
        # Get issue status to check if we need to add completed label
        local issue_status=$(echo "$issue" | jq -r '.status // ""')
        
        # Automatically add "completed" label if status is completed and not already present
        if [[ "$issue_status" == "completed" && ! "$labels" =~ "completed" ]]; then
            if [[ -n "$labels" ]]; then
                labels="$labels,completed"
            else
                labels="completed"
            fi
        fi
        
        sync_issue_safe "$number" "$title" "$priority" "$estimate" "$labels" "$description" "$tasks" "$acceptance" "$dependencies"
    done
    
    echo -e "${GREEN}✅ All issues from $ISSUES_DATA synced!${NC}"
}

# Set up labels from project config
setup_labels() {
    echo -e "${YELLOW}🏷️ Setting up labels...${NC}"
    
    # Get existing labels
    local existing_labels=$(gh label list --repo $REPO_OWNER/$REPO_NAME --json name --jq '.[].name' 2>/dev/null || echo "")
    
    jq -r '.labels[]? | "\(.name):\(.color):\(.description)"' $PROJECT_CONFIG | while IFS=':' read -r name color description; do
        if [[ -n "$name" && -n "$color" ]]; then
            # Check if label already exists
            if echo "$existing_labels" | grep -q "^$name$"; then
                echo -e "${BLUE}   ✅ Label '$name' already exists${NC}"
            else
                echo -e "${GREEN}   📝 Creating label '$name'${NC}"
                gh label create "$name" --color "$color" --description "$description" --repo $REPO_OWNER/$REPO_NAME 2>/dev/null || echo -e "${RED}   ❌ Failed to create label '$name'${NC}"
            fi
        fi
    done
}

# Set up milestones from project config
setup_milestones() {
    echo -e "${YELLOW}🎯 Setting up milestones...${NC}"
    
    # Get existing milestones
    local existing_milestones=$(gh api repos/$REPO_OWNER/$REPO_NAME/milestones --jq '.[].title' 2>/dev/null || echo "")
    
    jq -r '.milestones[]? | "\(.title)|\(.description)|\(.due_days)"' $PROJECT_CONFIG | while IFS='|' read -r title description due_days; do
        if [[ -n "$title" && -n "$due_days" ]]; then
            # Check if milestone already exists
            if echo "$existing_milestones" | grep -q "^$title$"; then
                echo -e "${BLUE}   ✅ Milestone '$title' already exists${NC}"
            else
                local due_date=$(date -d "+${due_days} days" -Iseconds 2>/dev/null || date -v +${due_days}d -Iseconds)
                echo -e "${GREEN}   📝 Creating milestone '$title'${NC}"
                gh api repos/$REPO_OWNER/$REPO_NAME/milestones -f title="$title" -f description="$description" -f due_on="$due_date" 2>/dev/null || echo -e "${RED}   ❌ Failed to create milestone '$title'${NC}"
            fi
        fi
    done
}

# Main sync function
main_sync() {
    echo -e "${GREEN}🔄 SmartChoice AI MVP - Modular Progress-Safe Sync${NC}"
    echo -e "${BLUE}📁 Repository: $REPO_OWNER/$REPO_NAME${NC}"
    echo -e "${BLUE}📄 Issues source: $ISSUES_DATA${NC}"
    
    # Create backup before any changes
    if [[ "${DRY_RUN:-false}" != "true" ]]; then
        backup_current_state
    fi
    
    # Set up project metadata
    setup_labels
    setup_milestones
    
    # Sync all issues from external file
    sync_from_issues_file
    
    show_sync_summary
}

# Show summary
show_sync_summary() {
    if [[ ! -f $SYNC_FILE ]]; then
        echo "No sync state found."
        return
    fi
    
    echo -e "\n${GREEN}📊 Sync Summary:${NC}"
    
    # Show current session stats if available
    if [[ -n "${SYNC_SESSION_CREATED:-}" ]]; then
        echo -e "${BLUE}📈 This Sync Session:${NC}"
        echo "  Created: $SYNC_SESSION_CREATED issues"
        echo "  Updated: $SYNC_SESSION_UPDATED issues" 
        echo "  No changes: $SYNC_SESSION_NO_CHANGE issues"
        if [[ $SYNC_SESSION_COMPLETED -gt 0 ]]; then
            echo -e "  ${GREEN}✅ Completed issues: $SYNC_SESSION_COMPLETED${NC}"
        fi
        echo ""
    fi
    
    # Show historical totals
    local total=$(jq -r '.synced_issues | length' $SYNC_FILE 2>/dev/null)
    local total_completed=$(jq -r '.synced_issues | to_entries[] | select(.value.status == "completed") | .key' $SYNC_FILE 2>/dev/null | wc -l | tr -d ' ')
    local total_in_progress=$(jq -r '.synced_issues | to_entries[] | select(.value.status == "in_progress") | .key' $SYNC_FILE 2>/dev/null | wc -l | tr -d ' ')
    
    echo -e "${BLUE}📊 Overall Project Status:${NC}"
    echo "  Total managed: $total issues"
    echo "  Completed: $total_completed issues"
    echo "  In progress: $total_in_progress issues"
    echo -e "  Repository: https://github.com/$REPO_OWNER/$REPO_NAME/issues"
    echo -e "  Last sync: $(jq -r '.last_sync' $SYNC_FILE 2>/dev/null)"
    echo -e "  Issues source: $ISSUES_DATA"
}

# Validate issues file
validate_issues() {
    echo -e "${BLUE}🔍 Validating $ISSUES_DATA...${NC}"
    
    # Check if file exists and is valid JSON
    if ! jq . $ISSUES_DATA >/dev/null 2>&1; then
        echo -e "${RED}❌ Invalid JSON in $ISSUES_DATA${NC}"
        return 1
    fi
    
    # Check required fields
    local issues_count=$(jq '.issues | length' $ISSUES_DATA)
    local valid_issues=0
    
    for i in $(seq 0 $((issues_count - 1))); do
        local issue=$(jq ".issues[$i]" $ISSUES_DATA)
        local number=$(echo "$issue" | jq -r '.number // empty')
        local title=$(echo "$issue" | jq -r '.title // empty')
        
        if [[ -n "$number" && -n "$title" ]]; then
            valid_issues=$((valid_issues + 1))
        else
            echo -e "${YELLOW}⚠️  Issue $i missing required fields (number, title)${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ Validation complete: $valid_issues/$issues_count issues valid${NC}"
    return 0
}

# Preview changes without applying
preview_changes() {
    echo -e "${PURPLE}🔍 PREVIEW MODE - No changes will be made${NC}"
    DRY_RUN=true main_sync
}

# List available backups
list_backups() {
    echo -e "${BLUE}📁 Available backups:${NC}"
    if [[ -d $BACKUP_DIR ]]; then
        ls -la $BACKUP_DIR/issues_backup_*.json 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' || echo "No backups found"
    else
        echo "No backup directory found"
    fi
}

# Edit issues file with validation
edit_issues() {
    local editor="${EDITOR:-nano}"
    
    echo -e "${BLUE}📝 Opening $ISSUES_DATA in $editor${NC}"
    echo -e "${YELLOW}💡 Tip: Save and exit to auto-validate${NC}"
    
    # Make backup before editing
    cp $ISSUES_DATA "${ISSUES_DATA}.backup"
    
    # Open editor
    $editor $ISSUES_DATA
    
    # Validate after editing
    if validate_issues; then
        echo -e "${GREEN}✅ Issues file updated successfully${NC}"
        rm "${ISSUES_DATA}.backup"
    else
        echo -e "${RED}❌ Validation failed. Restore backup? (y/N)${NC}"
        read -r restore
        if [[ "$restore" == "y" || "$restore" == "Y" ]]; then
            mv "${ISSUES_DATA}.backup" $ISSUES_DATA
            echo -e "${BLUE}📁 Backup restored${NC}"
        else
            rm "${ISSUES_DATA}.backup"
        fi
    fi
}

# Show file status
show_status() {
    echo -e "${BLUE}📄 File Status:${NC}"
    echo "  Project config: $PROJECT_CONFIG $(test -f $PROJECT_CONFIG && echo '✅' || echo '❌')"
    echo "  Issues data: $ISSUES_DATA $(test -f $ISSUES_DATA && echo '✅' || echo '❌')"
    echo "  Sync state: $SYNC_FILE $(test -f $SYNC_FILE && echo '✅' || echo '❌')"
    echo "  Backup dir: $BACKUP_DIR $(test -d $BACKUP_DIR && echo '✅' || echo '❌')"
    
    if [[ -f $ISSUES_DATA ]]; then
        local total=$(jq '.total_issues // (.issues | length)' $ISSUES_DATA)
        local version=$(jq -r '.version // "unknown"' $ISSUES_DATA)
        echo "  Total issues: $total"
        echo "  Data version: $version"
    fi
    
    echo ""
    show_sync_summary
}

# Main execution
check_dependencies
load_config
init_backup

case "${1:-sync}" in
    "sync")
        main_sync
        ;;
    "preview"|"dry-run")
        preview_changes
        ;;
    "status")
        show_status
        ;;
    "validate")
        validate_issues
        ;;
    "edit")
        edit_issues
        ;;
    "backup")
        backup_current_state
        ;;
    "backups")
        list_backups
        ;;
    "reset")
        echo -e "${YELLOW}🗑️ Resetting sync state...${NC}"
        rm -f $SYNC_FILE
        echo "Sync state reset."
        ;;
    *)
        echo "Usage: $0 {sync|preview|status|validate|edit|backup|backups|reset}"
        echo ""
        echo "Commands:"
        echo "  sync        - Sync all issues from $ISSUES_DATA (preserves checkboxes)"
        echo "  preview     - Preview what would change without making changes"
        echo "  status      - Show file status and sync summary"
        echo "  validate    - Validate $ISSUES_DATA structure"
        echo "  edit        - Edit $ISSUES_DATA with validation"
        echo "  backup      - Create backup of current GitHub issues"
        echo "  backups     - List available backups"
        echo "  reset       - Reset sync state"
        echo ""
        echo "Files:"
        echo "  $PROJECT_CONFIG  - Project configuration (repo, labels, milestones)"
        echo "  $ISSUES_DATA     - All issue definitions (edit this to modify issues)"
        echo "  $SYNC_FILE       - Sync state tracking (auto-generated)"
        exit 1
        ;;
esac