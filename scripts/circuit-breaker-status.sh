#!/bin/bash

# Circuit Breaker Status Update Utility
# Updates maintenance message and countdown via API

CIRCUIT_BREAKER_URL="http://localhost:6970"

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -m, --message TEXT     Set maintenance message"
    echo "  -i, --issue TEXT       Set current issue being fixed"
    echo "  -c, --countdown SECS   Set countdown in seconds"
    echo "  -t, --time MINUTES     Set countdown in minutes"
    echo "  -s, --status           Get current status"
    echo "  -h, --help             Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --message 'Bambi is upgrading the servers' --time 10"
    echo "  $0 --issue 'Installing security updates' --countdown 600"
    echo "  $0 --status"
}

update_status() {
    local json_data='{'
    local comma_needed=false
    
    if [ ! -z "$MESSAGE" ]; then
        json_data+='"message":"'"$MESSAGE"'"'
        comma_needed=true
    fi
    
    if [ ! -z "$ISSUE" ]; then
        [ "$comma_needed" = true ] && json_data+=','
        json_data+='"currentIssue":"'"$ISSUE"'"'
        comma_needed=true
    fi
    
    if [ ! -z "$COUNTDOWN" ]; then
        [ "$comma_needed" = true ] && json_data+=','
        json_data+='"countdown":'"$COUNTDOWN"
        comma_needed=true
    fi
    
    json_data+='}'
    
    echo "Updating status..."
    echo "Data: $json_data"
    
    response=$(curl -s -X POST "$CIRCUIT_BREAKER_URL/api/maintenance/status" \
        -H "Content-Type: application/json" \
        -d "$json_data")
    
    if echo "$response" | grep -q '"success":true'; then
        echo "✅ Status updated successfully"
    else
        echo "❌ Failed to update status"
        echo "Response: $response"
    fi
}

get_status() {
    echo "Current circuit breaker status:"
    curl -s "$CIRCUIT_BREAKER_URL/api/maintenance/status" | python3 -m json.tool 2>/dev/null || curl -s "$CIRCUIT_BREAKER_URL/api/maintenance/status"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--message)
            MESSAGE="$2"
            shift 2
            ;;
        -i|--issue)
            ISSUE="$2"
            shift 2
            ;;
        -c|--countdown)
            COUNTDOWN="$2"
            shift 2
            ;;
        -t|--time)
            COUNTDOWN=$((($2) * 60))
            shift 2
            ;;
        -s|--status)
            get_status
            exit 0
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# If no arguments provided, show status
if [ -z "$MESSAGE" ] && [ -z "$ISSUE" ] && [ -z "$COUNTDOWN" ]; then
    get_status
else
    update_status
fi
