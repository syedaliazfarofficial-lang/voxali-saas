# ============================================
# Voxali — Individual Tool Test Scripts
# ElevenLabs se call karne ke BAAD verify kro
# ============================================

$BASE = "https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1"
$TENANT = "527f8f35-72f0-4818-b514-ad7695cd076a"
$ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzAyOTAsImV4cCI6MjA4NTAwNjI5MH0.Az1hO8pFJcVIpeJJiSMe3MGEu5_u8oHaNqLW2gpBQn4"
$h = @{ "Content-Type"="application/json"; "X-TOOLS-KEY"="LUXE-AUREA-SECRET-2026"; "Authorization"="Bearer $ANON" }

Write-Host "`nVOXALI TOOL TESTS — Choose a number:`n" -ForegroundColor Cyan
Write-Host "  1. get-salon-info       (salon name, hours, current time)" -ForegroundColor White
Write-Host "  2. list-services        (all services with prices)" -ForegroundColor White
Write-Host "  3. list-staff           (stylists list)" -ForegroundColor White
Write-Host "  4. check-availability   (available slots for tomorrow)" -ForegroundColor White
Write-Host "  5. create-booking       (book haircut tomorrow 10am)" -ForegroundColor White
Write-Host "  6. cancel-booking       (cancel by name/phone)" -ForegroundColor White
Write-Host "  7. reschedule-booking   (change date/time)" -ForegroundColor White
Write-Host "  8. add-to-waitlist      (add to waitlist)" -ForegroundColor White
Write-Host "  9. create-payment-link  (Stripe payment link)" -ForegroundColor White
Write-Host "  10. confirm-booking     (mark confirmed)" -ForegroundColor White
Write-Host "  11. mark-manual-payment (cash payment)" -ForegroundColor White
Write-Host "  0. RUN ALL`n" -ForegroundColor Yellow

$choice = Read-Host "Enter number"
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$dayAfter = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")

function Run-Test {
    param($Name, $Url, $Body)
    Write-Host "`n--- $Name ---" -ForegroundColor Yellow
    $start = Get-Date
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method POST -Headers $h -Body $Body
        $ms = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
        $json = $r.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
        Write-Host "✅ $($r.StatusCode) OK  |  ${ms}ms" -ForegroundColor Green
        Write-Host $json
        return ($r.Content | ConvertFrom-Json)
    } catch {
        $ms = [math]::Round(((Get-Date) - $start).TotalMilliseconds)
        $body = ""
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $body = $reader.ReadToEnd()
        }
        Write-Host "❌ FAIL  |  ${ms}ms  |  $body" -ForegroundColor Red
        return $null
    }
}

# ===== TOOL 1: get-salon-info =====
if ($choice -eq "1" -or $choice -eq "0") {
    Run-Test "1. GET SALON INFO" "$BASE/get-salon-info?tenant_id=$TENANT" '{}'
}

# ===== TOOL 2: list-services =====
if ($choice -eq "2" -or $choice -eq "0") {
    Run-Test "2. LIST SERVICES" "$BASE/list-services?tenant_id=$TENANT" '{}'
}

# ===== TOOL 3: list-staff =====
if ($choice -eq "3" -or $choice -eq "0") {
    Run-Test "3. LIST STAFF" "$BASE/list-staff?tenant_id=$TENANT" '{}'
}

# ===== TOOL 4: check-availability =====
if ($choice -eq "4" -or $choice -eq "0") {
    Run-Test "4. CHECK AVAILABILITY ($tomorrow)" "$BASE/check-availability?tenant_id=$TENANT" "{`"date`":`"$tomorrow`"}"
}

# ===== TOOL 5: create-booking =====
if ($choice -eq "5" -or $choice -eq "0") {
    $r = Run-Test "5. CREATE BOOKING" "$BASE/create-booking?tenant_id=$TENANT" "{`"client_name`":`"Ali Test`",`"client_phone`":`"15551234567`",`"service_name`":`"haircut`",`"date`":`"$tomorrow`",`"time`":`"10:00`"}"
    if ($r) {
        Write-Host "`n  Booking ID: $($r.booking_id)" -ForegroundColor Cyan
        Write-Host "  Payment Link: $($r.payment_link)" -ForegroundColor Cyan
        $Global:lastBookingId = $r.booking_id
    }
}

# ===== TOOL 6: cancel-booking =====
if ($choice -eq "6" -or $choice -eq "0") {
    Run-Test "6. CANCEL BOOKING" "$BASE/cancel-booking?tenant_id=$TENANT" '{"name":"Ali Test","phone":"15551234567"}'
}

# ===== TOOL 7: reschedule-booking =====
if ($choice -eq "7" -or $choice -eq "0") {
    # First create a booking to reschedule
    if ($choice -eq "7") {
        $r = Run-Test "7a. CREATE (for reschedule)" "$BASE/create-booking?tenant_id=$TENANT" "{`"client_name`":`"Resch Test`",`"client_phone`":`"15559876543`",`"service_name`":`"haircut`",`"date`":`"$tomorrow`",`"time`":`"14:00`"}"
    }
    Run-Test "7. RESCHEDULE BOOKING" "$BASE/reschedule-booking?tenant_id=$TENANT" "{`"name`":`"Resch Test`",`"phone`":`"15559876543`",`"new_date`":`"$dayAfter`",`"new_time`":`"15:00`"}"
}

# ===== TOOL 8: add-to-waitlist =====
if ($choice -eq "8" -or $choice -eq "0") {
    Run-Test "8. ADD TO WAITLIST" "$BASE/add-to-waitlist?tenant_id=$TENANT" '{"name":"Waitlist User","phone":"15551112222","preferred_date":"2026-03-10","notes":"wants evening slot"}'
}

# ===== TOOL 9: create-payment-link =====
if ($choice -eq "9") {
    $bid = Read-Host "Enter booking_id"
    Run-Test "9. CREATE PAYMENT LINK" "$BASE/create-payment-link?tenant_id=$TENANT" "{`"booking_id`":`"$bid`",`"amount`":15}"
}

# ===== TOOL 10: confirm-booking =====
if ($choice -eq "10") {
    $bid = Read-Host "Enter booking_id"
    Run-Test "10. CONFIRM BOOKING" "$BASE/confirm-booking?tenant_id=$TENANT" "{`"booking_id`":`"$bid`"}"
}

# ===== TOOL 11: mark-manual-payment =====
if ($choice -eq "11") {
    $bid = Read-Host "Enter booking_id"
    Run-Test "11. MARK MANUAL PAYMENT" "$BASE/mark-manual-payment?tenant_id=$TENANT" "{`"booking_id`":`"$bid`",`"amount`":50,`"payment_method`":`"cash`"}"
}

Write-Host "`n--- DONE ---`n" -ForegroundColor Cyan
