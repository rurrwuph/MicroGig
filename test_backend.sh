#!/usr/bin/env bash
# ==============================================================================
# MicroGig Backend API End-to-End Automated Test Suite
# Tests all authentication, user, work, assignment, admin, and security endpoints.
# ==============================================================================

set -u

BASE_URL="${1:-http://localhost:8080}"
PASSED=0
FAILED=0
TOTAL=0
START_TIME=$(date +%s)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BOLD}${CYAN}==============================================================================${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}==============================================================================${NC}"
}

test_case() {
    local name="$1"
    local expected_status="$2"
    local method="$3"
    local endpoint="$4"
    local body="${5:-}"
    local auth_header="${6:-}"

    TOTAL=$((TOTAL + 1))
    local cmd=(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint")
    cmd+=(-H "Content-Type: application/json")

    if [ -n "$auth_header" ]; then
        cmd+=(-H "Authorization: Bearer $auth_header")
    fi

    if [ -n "$body" ]; then
        cmd+=(-d "$body")
    fi

    local response
    response=$("${cmd[@]}")
    local http_code
    http_code=$(echo "$response" | tail -n1)
    local response_body
    response_body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "  [${GREEN}PASS${NC}] ${BOLD}$name${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        LAST_RESPONSE="$response_body"
        return 0
    else
        echo -e "  [${RED}FAIL${NC}] ${BOLD}$name${NC} - Expected HTTP $expected_status, got $http_code"
        echo -e "         ${YELLOW}Response:${NC} $response_body"
        FAILED=$((FAILED + 1))
        LAST_RESPONSE="$response_body"
        return 1
    fi
}

extract_json_val() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\":[^,}]*" | sed -e "s/\"$key\"://" -e 's/"//g' -e 's/^[ \t]*//' | head -n1
}

TIMESTAMP=$(date +%s)
CLIENT_USER="client_${TIMESTAMP}"
CLIENT_EMAIL="client_${TIMESTAMP}@test.com"
FREE_USER="free_${TIMESTAMP}"
FREE_EMAIL="free_${TIMESTAMP}@test.com"
ADMIN_TOKEN=""
CLIENT_TOKEN=""
FREE_TOKEN=""

echo -e "${BOLD}${BLUE}Starting MicroGig Backend Test Suite against: ${CYAN}$BASE_URL${NC}"

# ==============================================================================
# Section 1: Authentication & User Registration
# ==============================================================================
print_header "1. Authentication & Security"

# 1.1 Sign in Seed Admin
test_case "Admin Sign-in (Seed Account)" 200 "POST" "/api/auth/signin" \
    '{"username":"admin","password":"admin123"}'
ADMIN_TOKEN=$(extract_json_val "$LAST_RESPONSE" "token")

# 1.2 Sign in Seed Client (Sarah Connor)
test_case "Client Sign-in (Sarah Connor)" 200 "POST" "/api/auth/signin" \
    '{"username":"sarah_connor","password":"password123"}'
CLIENT_TOKEN=$(extract_json_val "$LAST_RESPONSE" "token")

# 1.3 Sign in Seed Freelancer (John Doe)
test_case "Freelancer Sign-in (John Doe)" 200 "POST" "/api/auth/signin" \
    '{"username":"dev_john","password":"password123"}'
FREE_TOKEN=$(extract_json_val "$LAST_RESPONSE" "token")

# 1.4 Register New Client
test_case "Register New Client" 200 "POST" "/api/auth/signup" \
    "{\"username\":\"$CLIENT_USER\",\"email\":\"$CLIENT_EMAIL\",\"role\":\"client\",\"password\":\"password123\"}"

# 1.5 Register New Freelancer
test_case "Register New Freelancer" 200 "POST" "/api/auth/signup" \
    "{\"username\":\"$FREE_USER\",\"email\":\"$FREE_EMAIL\",\"role\":\"freelancer\",\"password\":\"password123\"}"

# 1.6 Login New Client
test_case "Login Newly Registered Client" 200 "POST" "/api/auth/signin" \
    "{\"username\":\"$CLIENT_USER\",\"password\":\"password123\"}"
NEW_CLIENT_TOKEN=$(extract_json_val "$LAST_RESPONSE" "token")

# 1.7 Login New Freelancer
test_case "Login Newly Registered Freelancer" 200 "POST" "/api/auth/signin" \
    "{\"username\":\"$FREE_USER\",\"password\":\"password123\"}"
NEW_FREE_TOKEN=$(extract_json_val "$LAST_RESPONSE" "token")

# ==============================================================================
# Section 2: User Profile, Wallet & Transactions
# ==============================================================================
print_header "2. User Profile, Wallet & Transactions"

# 2.1 Get Current User Profile
test_case "Get Authenticated User Profile (/api/user/me)" 200 "GET" "/api/user/me" "" "$NEW_CLIENT_TOKEN"

# 2.2 Update Profile
test_case "Update User Profile (/api/user/profile)" 200 "PUT" "/api/user/profile" \
    '{"fullName":"Test Client Corp","headline":"VP of Engineering","bio":"Building high-growth web platforms","skills":"Cloud, React, Java","portfolioUrl":"https://testcorp.io","githubUrl":"https://github.com/testcorp"}' \
    "$NEW_CLIENT_TOKEN"

# 2.3 Top-up Wallet Balance ($1000)
test_case "Wallet Top-up ($1000.00)" 200 "POST" "/api/user/topup" \
    '{"amount":1000.00}' "$NEW_CLIENT_TOKEN"

# 2.4 Withdraw from Wallet ($50)
test_case "Wallet Withdrawal ($50.00)" 200 "POST" "/api/user/withdraw" \
    '{"amount":50.00,"destination":"bank","destinationDetails":"US Bank Checking ...4491"}' "$NEW_CLIENT_TOKEN"

# 2.5 Get Transaction History
test_case "Get User Transaction History" 200 "GET" "/api/user/transactions" "" "$NEW_CLIENT_TOKEN"

# 2.6 Get Public Profile
test_case "Get Public Profile (/api/user/public/dev_john)" 200 "GET" "/api/user/public/dev_john" "" ""

# ==============================================================================
# Section 3: Work Request Marketplace Flow
# ==============================================================================
print_header "3. Work Request Lifecycle (Job Posting & Bidding)"

# 3.1 Public Marketplace Jobs List
test_case "Public Marketplace Jobs List (GET /api/work)" 200 "GET" "/api/work" "" ""

# 3.2 Create Work Request by Client ($400.00)
DEADLINE="2026-12-31T23:59:59"
test_case "Create Work Request ($400.00)" 200 "POST" "/api/work" \
    "{\"title\":\"Build Custom OAuth2 SSO Flow\",\"description\":\"Need custom OAuth2 SSO login with token validation\",\"amount\":400.00,\"deadline\":\"$DEADLINE\",\"category\":\"Web Development\",\"skills\":\"Java, Spring Security, OAuth2\"}" \
    "$NEW_CLIENT_TOKEN"
CREATED_JOB_ID=$(extract_json_val "$LAST_RESPONSE" "id")

# 3.3 Get Job by ID
test_case "Get Job Details by ID" 200 "GET" "/api/work/$CREATED_JOB_ID" "" "$NEW_CLIENT_TOKEN"

# 3.4 Get Live Viewers Stats
test_case "Get Job Live Viewers Stats" 200 "GET" "/api/work/$CREATED_JOB_ID/live-stats" "" "$NEW_FREE_TOKEN"

# 3.5 Update Work Request
test_case "Update Work Request Details" 200 "PUT" "/api/work/$CREATED_JOB_ID" \
    "{\"title\":\"Build Custom OAuth2 SSO Flow (Updated)\",\"description\":\"Updated requirements: include refresh token handling\",\"amount\":450.00,\"category\":\"Web Development\",\"skills\":\"Java, Spring Security, OAuth2, Redis\"}" \
    "$NEW_CLIENT_TOKEN"

# 3.6 Get Client's Posted Jobs
test_case "Get Client's Posted Jobs (/api/work/my)" 200 "GET" "/api/work/my" "" "$NEW_CLIENT_TOKEN"

# ==============================================================================
# Section 4: Freelancer Applications & Proposals
# ==============================================================================
print_header "4. Applications & Proposal Workflow"

# 4.1 Freelancer Submits Proposal / Bid
test_case "Freelancer Submits Application Proposal" 200 "POST" "/api/work/$CREATED_JOB_ID/apply" \
    '{"proposalNotes":"I have 5 years experience configuring OAuth2 with Spring Boot. Ready to start immediately.","bidAmount":450.00,"estimatedDays":3}' \
    "$NEW_FREE_TOKEN"
APPLICATION_ID=$(extract_json_val "$LAST_RESPONSE" "id")

# 4.2 Client Views Applications for Work Request
test_case "Client Views Proposals for Job" 200 "GET" "/api/work/$CREATED_JOB_ID/applications" "" "$NEW_CLIENT_TOKEN"

# 4.3 Freelancer Views Their Own Applications
test_case "Freelancer Views My Applications" 200 "GET" "/api/applications/my" "" "$NEW_FREE_TOKEN"

# 4.4 Client Accepts Application (Transitions Job to ASSIGNED)
test_case "Client Accepts Proposal ($APPLICATION_ID)" 200 "POST" "/api/work/$CREATED_JOB_ID/applications/$APPLICATION_ID/accept" "" "$NEW_CLIENT_TOKEN"

# ==============================================================================
# Section 5: Work Deliverables, Revisions & Payment Settlement
# ==============================================================================
print_header "5. Work Deliverables, Revisions & Payment"

# 5.1 Freelancer Views Active Assignments
test_case "Freelancer Views My Assignments" 200 "GET" "/api/assignments/my" "" "$NEW_FREE_TOKEN"

# 5.2 Freelancer Submits Work Deliverables
test_case "Freelancer Submits Work (V1)" 200 "POST" "/api/assignments/$CREATED_JOB_ID/submit" \
    '{"submissionNotes":"Implemented OAuth2 PKCE login with JWT verification. PR ready for review.","submissionUrl":"https://github.com/microgig/pr/101"}' \
    "$NEW_FREE_TOKEN"

# 5.3 Client Requests Revision
test_case "Client Requests Revision with Feedback" 200 "POST" "/api/assignments/$CREATED_JOB_ID/revision" \
    '{"feedback":"Please add unit test coverage for invalid refresh tokens."}' \
    "$NEW_CLIENT_TOKEN"

# 5.4 Freelancer Resubmits Revised Work
test_case "Freelancer Resubmits Work (V2)" 200 "POST" "/api/assignments/$CREATED_JOB_ID/submit" \
    '{"submissionNotes":"Added unit tests for refresh tokens and edge cases. Ready!","submissionUrl":"https://github.com/microgig/pr/101-v2"}' \
    "$NEW_FREE_TOKEN"

# 5.5 Client Approves & Releases Payment (0.1% Platform Fee Deducted)
test_case "Client Approves & Pays Freelancer (Rating 5/5)" 200 "POST" "/api/assignments/$CREATED_JOB_ID/pay" \
    '{"rating":5,"review":"Outstanding work! Very fast turnaround and clean test coverage."}' \
    "$NEW_CLIENT_TOKEN"

# ==============================================================================
# Section 6: Direct Accept & Job Cancellation Lifecycle
# ==============================================================================
print_header "6. Direct Accept & Job Cancellation Lifecycle"

# 6.1 Client Creates Second Job ($100.00)
test_case "Client Creates Second Job for Direct Accept" 200 "POST" "/api/work" \
    "{\"title\":\"Design Mobile App Landing Page\",\"description\":\"Create responsive landing page in Figma\",\"amount\":100.00,\"deadline\":\"$DEADLINE\",\"category\":\"UI/UX Design\",\"skills\":\"Figma, CSS\"}" \
    "$NEW_CLIENT_TOKEN"
SECOND_JOB_ID=$(extract_json_val "$LAST_RESPONSE" "id")

# 6.2 Freelancer Directly Accepts Open Job
test_case "Freelancer Directly Accepts Open Job" 200 "POST" "/api/assignments/$SECOND_JOB_ID/accept" "" "$NEW_FREE_TOKEN"

# 6.3 Freelancer Cancels Assignment with Reason
test_case "Freelancer Cancels Assignment" 200 "POST" "/api/assignments/$SECOND_JOB_ID/cancel" \
    '{"reason":"Schedule conflict, relinquishing gig back to marketplace."}' \
    "$NEW_FREE_TOKEN"

# 6.4 Client Cancels Open Job Post
test_case "Client Cancels Work Request" 200 "DELETE" "/api/work/$SECOND_JOB_ID" "" "$NEW_CLIENT_TOKEN"

# ==============================================================================
# Section 7: Admin Analytics, Moderation & Earnings Ledger
# ==============================================================================
print_header "7. Admin Dashboard, Moderation & Earnings"

# 7.1 Admin System Stats
test_case "Admin System Stats (/api/admin/stats)" 200 "GET" "/api/admin/stats" "" "$ADMIN_TOKEN"

# 7.2 Admin Users Drilldown
test_case "Admin Users Management Drilldown" 200 "GET" "/api/admin/users?page=0&size=10" "" "$ADMIN_TOKEN"

# 7.3 Admin Clients Analytics
test_case "Admin Clients Analytics" 200 "GET" "/api/admin/clients" "" "$ADMIN_TOKEN"

# 7.4 Admin Freelancers Analytics
test_case "Admin Freelancers Analytics" 200 "GET" "/api/admin/freelancers" "" "$ADMIN_TOKEN"

# 7.5 Admin Work Requests Drilldown
test_case "Admin Work Requests Drilldown" 200 "GET" "/api/admin/work-requests?page=0&size=10" "" "$ADMIN_TOKEN"

# 7.6 Admin Flagged Posts
test_case "Admin Flagged Posts Queue" 200 "GET" "/api/admin/work-requests/flagged" "" "$ADMIN_TOKEN"

# 7.7 Admin Platform Earnings & Commission Ledger
test_case "Admin Earnings & Platform Fee Ledger" 200 "GET" "/api/admin/earnings" "" "$ADMIN_TOKEN"

# 7.8 Admin Toggle User Lock (Lock then Unlock)
USER_TO_LOCK=$(extract_json_val "$LAST_RESPONSE" "id")
if [ -n "$USER_TO_LOCK" ]; then
    test_case "Admin Lock User Account" 200 "PUT" "/api/admin/users/7/lock?locked=true" "" "$ADMIN_TOKEN"
    test_case "Admin Unlock User Account" 200 "PUT" "/api/admin/users/7/lock?locked=false" "" "$ADMIN_TOKEN"
fi

# ==============================================================================
# Section 8: Real-time Notifications & Leaderboard
# ==============================================================================
print_header "8. Notifications & Leaderboard"

# 8.1 Get User Notifications
test_case "Get User Notifications" 200 "GET" "/api/notifications" "" "$NEW_CLIENT_TOKEN"

# 8.2 Get Unread Notification Count
test_case "Get Unread Notifications Count" 200 "GET" "/api/notifications/unread-count" "" "$NEW_CLIENT_TOKEN"

# 8.3 Mark All Notifications as Read
test_case "Mark All Notifications as Read" 200 "PUT" "/api/notifications/read-all" "" "$NEW_CLIENT_TOKEN"

# 8.4 Get Redis Top Freelancers Leaderboard
test_case "Get Redis Top Freelancers Leaderboard" 200 "GET" "/api/leaderboard/top-freelancers" "" ""

# ==============================================================================
# Section 9: Security Guards & RBAC Verification
# ==============================================================================
print_header "9. Security & Role-Based Access Control (RBAC) Verification"

# 9.1 Unauthorized Request without JWT
test_case "Reject Unauthenticated Request to Protected Route (401)" 401 "GET" "/api/user/me" "" ""

# 9.2 Forbidden Admin Route for Freelancer
test_case "Reject Non-Admin Request to /api/admin/stats (403)" 403 "GET" "/api/admin/stats" "" "$NEW_FREE_TOKEN"

# 9.3 Invalid Login Credentials
test_case "Reject Invalid Credentials (401)" 401 "POST" "/api/auth/signin" \
    '{"username":"admin","password":"wrongpassword"}' ""

# ==============================================================================
# Scoreboard & Summary
# ==============================================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "\n${BOLD}${CYAN}==============================================================================${NC}"
echo -e "${BOLD}                        TEST EXECUTION SUMMARY                                ${NC}"
echo -e "${BOLD}${CYAN}==============================================================================${NC}"
echo -e "  Total Tests Run:  ${BOLD}$TOTAL${NC}"
echo -e "  Passed:           ${GREEN}${BOLD}$PASSED${NC}"
echo -e "  Failed:           ${RED}${BOLD}$FAILED${NC}"
echo -e "  Execution Time:   ${BOLD}${DURATION}s${NC}"
echo -e "${BOLD}${CYAN}==============================================================================${NC}"

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎉 ALL $TOTAL TESTS PASSED SUCCESSFULLY! Backend is rock solid.${NC}\n"
    exit 0
else
    echo -e "${RED}${BOLD}❌ $FAILED TEST(S) FAILED. Review logs above.${NC}\n"
    exit 1
fi
