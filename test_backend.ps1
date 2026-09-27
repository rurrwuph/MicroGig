# ==============================================================================
# MicroGig Backend API End-to-End Automated Test Suite (PowerShell)
# Tests all authentication, user, work, assignment, admin, and security endpoints.
# ==============================================================================

param(
    [string]$BaseUrl = "http://localhost:8080"
)

$ErrorActionPreference = "Continue"
$Passed = 0
$Failed = 0
$Total = 0
$Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

function Print-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "==============================================================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "==============================================================================" -ForegroundColor Cyan
}

function Invoke-TestCase {
    param(
        [string]$Name,
        [int]$ExpectedStatus,
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null,
        [string]$Token = $null
    )

    $global:Total++
    $uri = "$BaseUrl$Endpoint"
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $statusCode = 0
    $responseBody = ""

    try {
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
        }
        if ($Body) {
            $params["Body"] = [System.Text.Encoding]::UTF8.GetBytes($Body)
        }

        $res = Invoke-WebRequest @params
        $statusCode = [int]$res.StatusCode
        $responseBody = $res.Content
    }
    catch {
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $responseBody = $reader.ReadToEnd()
            }
        }
        else {
            $statusCode = 0
            $responseBody = $_.Exception.Message
        }
    }

    if ($statusCode -eq $ExpectedStatus) {
        Write-Host "  [PASS] " -ForegroundColor Green -NoNewline
        Write-Host "$Name (HTTP $statusCode)"
        $global:Passed++
        return $responseBody
    }
    else {
        Write-Host "  [FAIL] " -ForegroundColor Red -NoNewline
        Write-Host "$Name - Expected HTTP $ExpectedStatus, got $statusCode"
        Write-Host "         Response: $responseBody" -ForegroundColor Yellow
        $global:Failed++
        return $responseBody
    }
}

function Parse-JsonVal {
    param([string]$Json, [string]$Key)
    try {
        $obj = $Json | ConvertFrom-Json
        return $obj.$Key
    }
    catch {
        return ""
    }
}

$Timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$ClientUser = "client_$Timestamp"
$ClientEmail = "client_$Timestamp@test.com"
$FreeUser = "free_$Timestamp"
$FreeEmail = "free_$Timestamp@test.com"

Write-Host "Starting MicroGig Backend Test Suite against: $BaseUrl" -ForegroundColor Magenta

# ==============================================================================
# Section 1: Authentication & Security
# ==============================================================================
Print-Header "1. Authentication & Security"

# 1.1 Sign in Admin
$res = Invoke-TestCase -Name "Admin Sign-in (Seed Account)" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/auth/signin" -Body '{"username":"admin","password":"admin123"}'
$AdminToken = Parse-JsonVal -Json $res -Key "token"

# 1.2 Sign in Client
$res = Invoke-TestCase -Name "Client Sign-in (Sarah Connor)" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/auth/signin" -Body '{"username":"sarah_connor","password":"password123"}'
$ClientToken = Parse-JsonVal -Json $res -Key "token"

# 1.3 Sign in Freelancer
$res = Invoke-TestCase -Name "Freelancer Sign-in (John Doe)" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/auth/signin" -Body '{"username":"dev_john","password":"password123"}'
$FreeToken = Parse-JsonVal -Json $res -Key "token"

# 1.4 Register New Client
$signupClientBody = @{ username = $ClientUser; email = $ClientEmail; role = "client"; password = "password123" } | ConvertTo-Json
$res = Invoke-TestCase -Name "Register New Client" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/auth/signup" -Body $signupClientBody

# 1.5 Register New Freelancer
$signupFreeBody = @{ username = $FreeUser; email = $FreeEmail; role = "freelancer"; password = "password123" } | ConvertTo-Json
$res = Invoke-TestCase -Name "Register New Freelancer" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/auth/signup" -Body $signupFreeBody

# 1.6 Login New Client
$loginClientBody = @{ username = $ClientUser; password = "password123" } | ConvertTo-Json
$res = Invoke-TestCase -Name "Login Newly Registered Client" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/auth/signin" -Body $loginClientBody
$NewClientToken = Parse-JsonVal -Json $res -Key "token"

# 1.7 Login New Freelancer
$loginFreeBody = @{ username = $FreeUser; password = "password123" } | ConvertTo-Json
$res = Invoke-TestCase -Name "Login Newly Registered Freelancer" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/auth/signin" -Body $loginFreeBody
$NewFreeToken = Parse-JsonVal -Json $res -Key "token"

# ==============================================================================
# Section 2: User Profile, Wallet & Transactions
# ==============================================================================
Print-Header "2. User Profile, Wallet & Transactions"

# 2.1 Profile
$res = Invoke-TestCase -Name "Get Authenticated User Profile (/api/user/me)" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/user/me" -Token $NewClientToken

# 2.2 Update Profile
$updateProfileBody = @{
    fullName = "Test Client Corp"
    headline = "VP of Engineering"
    bio = "Building high-growth web platforms"
    skills = "Cloud, React, Java"
    portfolioUrl = "https://testcorp.io"
    githubUrl = "https://github.com/testcorp"
} | ConvertTo-Json
$res = Invoke-TestCase -Name "Update User Profile (/api/user/profile)" -ExpectedStatus 200 -Method "PUT" -Endpoint "/api/user/profile" -Body $updateProfileBody -Token $NewClientToken

# 2.3 Top-up Wallet ($1000)
$res = Invoke-TestCase -Name "Wallet Top-up ($1000.00)" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/user/topup" -Body '{"amount":1000.00}' -Token $NewClientToken

# 2.4 Withdraw ($50)
$res = Invoke-TestCase -Name "Wallet Withdrawal ($50.00)" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/user/withdraw" -Body '{"amount":50.00,"destination":"bank","destinationDetails":"US Bank Checking ...4491"}' -Token $NewClientToken

# 2.5 Transactions
$res = Invoke-TestCase -Name "Get User Transaction History" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/user/transactions" -Token $NewClientToken

# 2.6 Public Profile
$res = Invoke-TestCase -Name "Get Public Profile (/api/user/public/dev_john)" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/user/public/dev_john"

# ==============================================================================
# Section 3: Work Request Marketplace Flow
# ==============================================================================
Print-Header "3. Work Request Lifecycle (Job Posting & Bidding)"

# 3.1 Public Jobs List
$res = Invoke-TestCase -Name "Public Marketplace Jobs List (GET /api/work)" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/work"

# 3.2 Create Job
$createJobBody = @{
    title = "Build Custom OAuth2 SSO Flow"
    description = "Need custom OAuth2 SSO login with token validation"
    amount = 400.00
    deadline = "2026-12-31T23:59:59"
    category = "Web Development"
    skills = "Java, Spring Security, OAuth2"
} | ConvertTo-Json
$res = Invoke-TestCase -Name "Create Work Request ($400.00)" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/work" -Body $createJobBody -Token $NewClientToken
$CreatedJobId = Parse-JsonVal -Json $res -Key "id"

# 3.3 Get Job Details
$res = Invoke-TestCase -Name "Get Job Details by ID" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/work/$CreatedJobId" -Token $NewClientToken

# 3.4 Live Stats
$res = Invoke-TestCase -Name "Get Job Live Viewers Stats" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/work/$CreatedJobId/live-stats" -Token $NewFreeToken

# 3.5 Update Job
$updateJobBody = @{
    title = "Build Custom OAuth2 SSO Flow (Updated)"
    description = "Updated requirements: include refresh token handling"
    amount = 450.00
    category = "Web Development"
    skills = "Java, Spring Security, OAuth2, Redis"
} | ConvertTo-Json
$res = Invoke-TestCase -Name "Update Work Request Details" -ExpectedStatus 200 -Method "PUT" -Endpoint "/api/work/$CreatedJobId" -Body $updateJobBody -Token $NewClientToken

# 3.6 My Posted Jobs
$res = Invoke-TestCase -Name "Get Client's Posted Jobs (/api/work/my)" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/work/my" -Token $NewClientToken

# ==============================================================================
# Section 4: Applications & Proposals Workflow
# ==============================================================================
Print-Header "4. Applications & Proposal Workflow"

# 4.1 Freelancer Submits Proposal
$proposalBody = @{
    proposalNotes = "I have 5 years experience configuring OAuth2 with Spring Boot. Ready to start immediately."
    bidAmount = 450.00
    estimatedDays = 3
} | ConvertTo-Json
$res = Invoke-TestCase -Name "Freelancer Submits Application Proposal" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/work/$CreatedJobId/apply" -Body $proposalBody -Token $NewFreeToken
$AppId = Parse-JsonVal -Json $res -Key "id"

# 4.2 Client Views Proposals
$res = Invoke-TestCase -Name "Client Views Proposals for Job" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/work/$CreatedJobId/applications" -Token $NewClientToken

# 4.3 Freelancer Views Own Applications
$res = Invoke-TestCase -Name "Freelancer Views My Applications" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/applications/my" -Token $NewFreeToken

# 4.4 Client Accepts Application
$res = Invoke-TestCase -Name "Client Accepts Proposal ($AppId)" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/work/$CreatedJobId/applications/$AppId/accept" -Token $NewClientToken

# ==============================================================================
# Section 5: Work Deliverables, Revisions & Payment Settlement
# ==============================================================================
Print-Header "5. Work Deliverables, Revisions & Payment"

# 5.1 Freelancer Active Assignments
$res = Invoke-TestCase -Name "Freelancer Views My Assignments" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/assignments/my" -Token $NewFreeToken

# 5.2 Freelancer Submits Work (V1)
$submitBody = @{
    submissionNotes = "Implemented OAuth2 PKCE login with JWT verification. PR ready for review."
    submissionUrl = "https://github.com/microgig/pr/101"
} | ConvertTo-Json
$res = Invoke-TestCase -Name "Freelancer Submits Work (V1)" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/assignments/$CreatedJobId/submit" -Body $submitBody -Token $NewFreeToken

# 5.3 Client Requests Revision
$revisionBody = @{
    feedback = "Please add unit test coverage for invalid refresh tokens."
} | ConvertTo-Json
$res = Invoke-TestCase -Name "Client Requests Revision with Feedback" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/assignments/$CreatedJobId/revision" -Body $revisionBody -Token $NewClientToken

# 5.4 Freelancer Resubmits Work (V2)
$resubmitBody = @{
    submissionNotes = "Added unit tests for refresh tokens and edge cases. Ready!"
    submissionUrl = "https://github.com/microgig/pr/101-v2"
} | ConvertTo-Json
$res = Invoke-TestCase -Name "Freelancer Resubmits Work (V2)" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/assignments/$CreatedJobId/submit" -Body $resubmitBody -Token $NewFreeToken

# 5.5 Client Approves & Releases Payment
$payBody = @{
    rating = 5
    review = "Outstanding work! Very fast turnaround and clean test coverage."
} | ConvertTo-Json
$res = Invoke-TestCase -Name "Client Approves & Pays Freelancer (Rating 5/5)" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/assignments/$CreatedJobId/pay" -Body $payBody -Token $NewClientToken

# ==============================================================================
# Section 6: Direct Accept & Job Cancellation Lifecycle
# ==============================================================================
Print-Header "6. Direct Accept & Job Cancellation Lifecycle"

# 6.1 Client Creates Second Job
$secondJobBody = @{
    title = "Design Mobile App Landing Page"
    description = "Create responsive landing page in Figma"
    amount = 100.00
    deadline = "2026-12-31T23:59:59"
    category = "UI/UX Design"
    skills = "Figma, CSS"
} | ConvertTo-Json
$res = Invoke-TestCase -Name "Client Creates Second Job for Direct Accept" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/work" -Body $secondJobBody -Token $NewClientToken
$SecondJobId = Parse-JsonVal -Json $res -Key "id"

# 6.2 Freelancer Direct Accept
$res = Invoke-TestCase -Name "Freelancer Directly Accepts Open Job" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/assignments/$SecondJobId/accept" -Token $NewFreeToken

# 6.3 Freelancer Cancels
$cancelBody = @{
    reason = "Schedule conflict, relinquishing gig back to marketplace."
} | ConvertTo-Json
$res = Invoke-TestCase -Name "Freelancer Cancels Assignment" -ExpectedStatus 200 -Method "POST" -Endpoint "/api/assignments/$SecondJobId/cancel" -Body $cancelBody -Token $NewFreeToken

# 6.4 Client Cancels Job Post
$res = Invoke-TestCase -Name "Client Cancels Work Request" -ExpectedStatus 200 -Method "DELETE" -Endpoint "/api/work/$SecondJobId" -Token $NewClientToken

# ==============================================================================
# Section 7: Admin Analytics, Moderation & Earnings Ledger
# ==============================================================================
Print-Header "7. Admin Dashboard, Moderation & Earnings"

# 7.1 Admin Stats
$res = Invoke-TestCase -Name "Admin System Stats (/api/admin/stats)" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/admin/stats" -Token $AdminToken

# 7.2 Admin Users Drilldown
$res = Invoke-TestCase -Name "Admin Users Management Drilldown" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/admin/users?page=0&size=10" -Token $AdminToken

# 7.3 Admin Clients Analytics
$res = Invoke-TestCase -Name "Admin Clients Analytics" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/admin/clients" -Token $AdminToken

# 7.4 Admin Freelancers Analytics
$res = Invoke-TestCase -Name "Admin Freelancers Analytics" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/admin/freelancers" -Token $AdminToken

# 7.5 Admin Work Requests Drilldown
$res = Invoke-TestCase -Name "Admin Work Requests Drilldown" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/admin/work-requests?page=0&size=10" -Token $AdminToken

# 7.6 Admin Flagged Posts
$res = Invoke-TestCase -Name "Admin Flagged Posts Queue" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/admin/work-requests/flagged" -Token $AdminToken

# 7.7 Admin Platform Earnings
$res = Invoke-TestCase -Name "Admin Earnings & Platform Fee Ledger" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/admin/earnings" -Token $AdminToken

# 7.8 Admin User Lock Toggle
$res = Invoke-TestCase -Name "Admin Lock User Account" -ExpectedStatus 200 -Method "PUT" -Endpoint "/api/admin/users/7/lock?locked=true" -Token $AdminToken
$res = Invoke-TestCase -Name "Admin Unlock User Account" -ExpectedStatus 200 -Method "PUT" -Endpoint "/api/admin/users/7/lock?locked=false" -Token $AdminToken

# ==============================================================================
# Section 8: Real-time Notifications & Leaderboard
# ==============================================================================
Print-Header "8. Notifications & Leaderboard"

# 8.1 User Notifications
$res = Invoke-TestCase -Name "Get User Notifications" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/notifications" -Token $NewClientToken

# 8.2 Unread Count
$res = Invoke-TestCase -Name "Get Unread Notifications Count" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/notifications/unread-count" -Token $NewClientToken

# 8.3 Mark All Read
$res = Invoke-TestCase -Name "Mark All Notifications as Read" -ExpectedStatus 200 -Method "PUT" -Endpoint "/api/notifications/read-all" -Token $NewClientToken

# 8.4 Leaderboard
$res = Invoke-TestCase -Name "Get Redis Top Freelancers Leaderboard" -ExpectedStatus 200 -Method "GET" -Endpoint "/api/leaderboard/top-freelancers"

# ==============================================================================
# Section 9: Security Guards & RBAC Verification
# ==============================================================================
Print-Header "9. Security & Role-Based Access Control (RBAC) Verification"

# 9.1 Unauthorized Request
$res = Invoke-TestCase -Name "Reject Unauthenticated Request to Protected Route (401)" -ExpectedStatus 401 -Method "GET" -Endpoint "/api/user/me"

# 9.2 Forbidden Admin Route
$res = Invoke-TestCase -Name "Reject Non-Admin Request to /api/admin/stats (403)" -ExpectedStatus 403 -Method "GET" -Endpoint "/api/admin/stats" -Token $NewFreeToken

# 9.3 Invalid Credentials
$res = Invoke-TestCase -Name "Reject Invalid Credentials (401)" -ExpectedStatus 401 -Method "POST" -Endpoint "/api/auth/signin" -Body '{"username":"admin","password":"wrongpassword"}'

# ==============================================================================
# Summary
# ==============================================================================
$Stopwatch.Stop()
$Duration = [Math]::Round($Stopwatch.Elapsed.TotalSeconds, 2)

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "                        TEST EXECUTION SUMMARY                                " -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  Total Tests Run:  $Total" -ForegroundColor White
Write-Host "  Passed:           $Passed" -ForegroundColor Green
Write-Host "  Failed:           $Failed" -ForegroundColor $(if ($Failed -eq 0) { "Green" } else { "Red" })
Write-Host "  Execution Time:   ${Duration}s" -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Cyan

if ($Failed -eq 0) {
    Write-Host "🎉 ALL $Total TESTS PASSED SUCCESSFULLY! Backend is rock solid." -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ $Failed TEST(S) FAILED. Review logs above." -ForegroundColor Red
    exit 1
}
