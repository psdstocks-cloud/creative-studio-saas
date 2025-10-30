#!/bin/bash

# Authentication Testing Script
# This script tests the session validation and authenticated API endpoints

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8788}"
ACCESS_TOKEN="${ACCESS_TOKEN:-}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Authentication Testing Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4

    echo -e "${YELLOW}Testing:${NC} $description"
    echo -e "${YELLOW}Endpoint:${NC} $method $endpoint"

    if [ -z "$ACCESS_TOKEN" ]; then
        echo -e "${RED}❌ ACCESS_TOKEN not set. Cannot test authenticated endpoints.${NC}"
        echo ""
        return 1
    fi

    # Build curl command
    local curl_cmd="curl -s -w '\nHTTP_STATUS:%{http_code}' -X $method"
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $ACCESS_TOKEN'"
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"

    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi

    curl_cmd="$curl_cmd '$API_BASE_URL$endpoint'"

    # Execute request
    response=$(eval $curl_cmd)

    # Extract status code
    http_status=$(echo "$response" | grep -oP 'HTTP_STATUS:\K\d+' | tail -1)
    body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

    # Check status
    if [ "$http_status" = "401" ]; then
        echo -e "${RED}❌ FAILED - Got 401 Unauthorized${NC}"
        echo -e "${RED}Response:${NC} $body"
        echo ""
        return 1
    elif [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
        echo -e "${GREEN}✅ PASSED - Status: $http_status${NC}"
        echo -e "${GREEN}Response:${NC} $body"
        echo ""
        return 0
    elif [ "$http_status" -ge 400 ]; then
        echo -e "${YELLOW}⚠️  Got status $http_status (not 401)${NC}"
        echo -e "${YELLOW}Response:${NC} $body"
        echo ""
        return 0
    else
        echo -e "${YELLOW}⚠️  Got unexpected status: $http_status${NC}"
        echo -e "${YELLOW}Response:${NC} $body"
        echo ""
        return 0
    fi
}

# Check if ACCESS_TOKEN is set
if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}ERROR: ACCESS_TOKEN environment variable is not set${NC}"
    echo ""
    echo "To get your access token:"
    echo "1. Login to your app in the browser"
    echo "2. Open DevTools (F12)"
    echo "3. Go to Application/Storage tab"
    echo "4. Look under 'Cookies' or 'Local Storage'"
    echo "5. Find the Supabase access token (sb-*-access-token)"
    echo ""
    echo "Then run:"
    echo "  export ACCESS_TOKEN='your_token_here'"
    echo "  $0"
    echo ""
    exit 1
fi

echo -e "${GREEN}ACCESS_TOKEN is set${NC}"
echo -e "${GREEN}API Base URL: $API_BASE_URL${NC}"
echo ""

# Test 1: Session endpoint
echo -e "${BLUE}Test 1: Session Validation${NC}"
test_endpoint "GET" "/api/auth/session" "Check if session returns user data"

# Test 2: Profile deduct (with amount=0 to just check balance)
echo -e "${BLUE}Test 2: Profile Balance${NC}"
test_endpoint "POST" "/api/profile/deduct" "Check user profile balance" '{"amount":0}'

# Test 3: Stock sources
echo -e "${BLUE}Test 3: Stock Sources${NC}"
test_endpoint "GET" "/api/stock-sources" "Fetch stock sources"

# Test 4: Orders list
echo -e "${BLUE}Test 4: Orders List${NC}"
test_endpoint "GET" "/api/orders" "Fetch user orders"

# Test 5: Billing plans
echo -e "${BLUE}Test 5: Billing Plans${NC}"
test_endpoint "GET" "/api/billing/plans" "Fetch billing plans"

# Test 6: Current subscription
echo -e "${BLUE}Test 6: Current Subscription${NC}"
test_endpoint "GET" "/api/billing/subscription" "Fetch current subscription"

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Authentication testing complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "If any tests showed ❌ FAILED with 401, there's still an auth issue."
echo "If all tests passed ✅ or showed other status codes (400, 404, etc.), auth is working!"
