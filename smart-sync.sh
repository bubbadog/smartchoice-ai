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
  "version": "1.0.0",
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
    jq -r ".[] | select(.title == \"$issue_title\") | \"\(.number)|\(.body)\""
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
    local content="$title$description$tasks$acceptance"
    local current_hash=$(echo -n "$content" | shasum -a 256 | cut -d' ' -f1)
    local stored_hash=$(jq -r ".synced_issues[\"$number\"].hash // \"\"" $SYNC_FILE 2>/dev/null)
    
    # Get existing issue info
    local existing_info=$(get_existing_issue "$full_title")
    local existing_number=""
    local existing_body=""
    
    if [[ -n "$existing_info" ]]; then
        existing_number=$(echo "$existing_info" | cut -d'|' -f1)
        existing_body=$(echo "$existing_info" | cut -d'|' -f2-)
    fi
    
    # Preserve checkboxes in tasks
    local preserved_tasks=$(preserve_checkboxes "$tasks" "$existing_body")
    
    local body="**Priority**: $priority
**Estimate**: $estimate

**Description**: $description

**Tasks**:
$preserved_tasks

**Acceptance Criteria**:
$acceptance

**Dependencies**: $dependencies

---
*Last synced: $(date)*"

    local issue_labels=$(echo $labels | tr ',' ' ')
    
    if [[ -n "$existing_number" ]]; then
        # Issue exists - check if content changed
        if [[ "$current_hash" != "$stored_hash" ]]; then
            echo -e "${YELLOW}🔄 Updating issue #$number: $title${NC}"
            echo -e "${BLUE}   📝 Preserving completed checkboxes${NC}"
            
            # Show what would change (preview mode)
            if [[ "${DRY_RUN:-false}" == "true" ]]; then
                echo -e "${PURPLE}   [DRY RUN] Would update issue body${NC}"
            else
                gh issue edit $existing_number --repo $REPO_OWNER/$REPO_NAME --body "$body" 2>/dev/null || echo -e "${RED}   ❌ Update failed${NC}"
                update_sync_state "$number" "$current_hash" "updated"
            fi
        else
            echo -e "${BLUE}✅ Issue #$number: $title (no changes)${NC}"
        fi
    else
        # Create new issue
        echo -e "${GREEN}📝 Creating new issue #$number: $title${NC}"
        if [[ "${DRY_RUN:-false}" == "true" ]]; then
            echo -e "${PURPLE}   [DRY RUN] Would create new issue${NC}"
        else
            gh issue create --repo $REPO_OWNER/$REPO_NAME \
                --title "$full_title" \
                --body "$body" \
                --label "$issue_labels" >/dev/null 2>&1 || echo -e "${RED}   ❌ Creation failed${NC}"
            update_sync_state "$number" "$current_hash" "created"
        fi
    fi
}

# Update sync state
update_sync_state() {
    local issue_number="$1"
    local issue_hash="$2"
    local action="$3"
    
    if [[ ! -f $SYNC_FILE ]]; then
        echo '{"synced_issues": {}, "last_sync": "", "version": "1.1"}' > $SYNC_FILE
    fi
    
    jq --arg num "$issue_number" --arg hash "$issue_hash" --arg action "$action" --arg timestamp "$(date -Iseconds)" \
       '.synced_issues[$num] = {hash: $hash, action: $action, last_updated: $timestamp} | .last_sync = $timestamp' \
       $SYNC_FILE > temp_sync.json && mv temp_sync.json $SYNC_FILE
}

# Load and sync issues from external file
sync_from_issues_file() {
    local issue_count=$(jq '.issues | length' $ISSUES_DATA)
    echo -e "${YELLOW}📝 Syncing $issue_count issues from $ISSUES_DATA...${NC}"
    
    for i in $(seq 0 $((issue_count - 1))); do
        local issue=$(jq ".issues[$i]" $ISSUES_DATA)
        local number=$(echo "$issue" | jq -r '.number')
        local title=$(echo "$issue" | jq -r '.title')
        local priority=$(echo "$issue" | jq -r '.priority')
        local estimate=$(echo "$issue" | jq -r '.estimate')
        local labels=$(echo "$issue" | jq -r '.labels | join(",")')
        local description=$(echo "$issue" | jq -r '.description')
        local tasks=$(echo "$issue" | jq -r '.tasks[] | "- [ ] " + .' | paste -sd '\n' -)
        local acceptance=$(echo "$issue" | jq -r '.acceptance_criteria[] | "- " + .' | paste -sd '\n' -)
        local dependencies=$(echo "$issue" | jq -r '.dependencies')
        
        sync_issue_safe "$number" "$title" "$priority" "$estimate" "$labels" "$description" "$tasks" "$acceptance" "$dependencies"
    done
    
    echo -e "${GREEN}✅ All issues from $ISSUES_DATA synced!${NC}"
}

# Set up labels from project config
setup_labels() {
    echo -e "${YELLOW}🏷️ Setting up labels...${NC}"
    
    jq -r '.labels[]? | "\(.name):\(.color):\(.description)"' $PROJECT_CONFIG | while IFS=':' read -r name color description; do
        if [[ -n "$name" && -n "$color" ]]; then
            gh label create "$name" --color "$color" --description "$description" --repo $REPO_OWNER/$REPO_NAME 2>/dev/null || true
        fi
    done
}

# Set up milestones from project config
setup_milestones() {
    echo -e "${YELLOW}🎯 Setting up milestones...${NC}"
    
    jq -r '.milestones[]? | "\(.title)|\(.description)|\(.due_days)"' $PROJECT_CONFIG | while IFS='|' read -r title description due_days; do
        if [[ -n "$title" && -n "$due_days" ]]; then
            local due_date=$(date -d "+${due_days} days" -Iseconds 2>/dev/null || date -v +${due_days}d -Iseconds)
            gh api repos/$REPO_OWNER/$REPO_NAME/milestones -f title="$title" -f description="$description" -f due_on="$due_date" 2>/dev/null || true
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
    local created=$(jq -r '.synced_issues | to_entries[] | select(.value.action == "created") | .key' $SYNC_FILE 2>/dev/null | wc -l)
    local updated=$(jq -r '.synced_issues | to_entries[] | select(.value.action == "updated") | .key' $SYNC_FILE 2>/dev/null | wc -l)
    local total=$(jq -r '.synced_issues | length' $SYNC_FILE 2>/dev/null)
    
    echo "  Created: $created issues"
    echo "  Updated: $updated issues"
    echo "  Total managed: $total issues"
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