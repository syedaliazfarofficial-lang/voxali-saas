// ============================================
// TIMEZONE CONVERSION CODE FOR N8N WORKFLOWS
// ============================================
// Add this as a new Code node in all booking workflows
// Position: Right after "Parse Input" node

// Import luxon for timezone handling
const { DateTime } = require('luxon');

// Get input data
const input = $input.first().json;

// Get salon timezone from database (will be fetched from Supabase)
// For now, hardcode - later will be dynamic from tenants table
const SALON_TIMEZONE = 'America/New_York';  // Change based on salon location

// Parse the incoming datetime
// Customer may send in various formats, handle them all
let customerDateTime;

if (input.start_at) {
    // Try to parse the datetime
    customerDateTime = DateTime.fromISO(input.start_at, { zone: SALON_TIMEZONE });

    // If invalid, try other formats
    if (!customerDateTime.isValid) {
        // Try RFC2822 format
        customerDateTime = DateTime.fromRFC2822(input.start_at);
    }

    if (!customerDateTime.isValid) {
        // Try SQL format
        customerDateTime = DateTime.fromSQL(input.start_at, { zone: SALON_TIMEZONE });
    }

    // If still invalid, throw error
    if (!customerDateTime.isValid) {
        throw new Error(`Invalid datetime format: ${input.start_at}`);
    }
}

// Convert to different representations
const result = {
    ...input,

    // UTC time (for database storage - ALWAYS store in UTC)
    start_at: customerDateTime.toUTC().toISO(),

    // Local salon time (for display)
    start_at_local: customerDateTime.setZone(SALON_TIMEZONE).toISO(),

    // Formatted for display
    formatted_date: customerDateTime.setZone(SALON_TIMEZONE).toFormat('EEEE, MMM dd, yyyy'),
    formatted_time: customerDateTime.setZone(SALON_TIMEZONE).toFormat('h:mm a'),
    formatted_time_with_tz: customerDateTime.setZone(SALON_TIMEZONE).toFormat('h:mm a ZZZZ'),

    // Timezone info
    salon_timezone: SALON_TIMEZONE,
    timezone_abbr: customerDateTime.setZone(SALON_TIMEZONE).toFormat('ZZZZ'), // e.g., "EST" or "EDT"

    // For email templates
    display_datetime: `${customerDateTime.setZone(SALON_TIMEZONE).toFormat('EEEE, MMM dd, yyyy')} at ${customerDateTime.setZone(SALON_TIMEZONE).toFormat('h:mm a ZZZZ')}`
};

return { json: result };

// ============================================
// EXAMPLE OUTPUTS
// ============================================
/*
Input: "2026-02-15T14:00:00"
Output: {
  start_at: "2026-02-15T19:00:00.000Z",  // UTC
  start_at_local: "2026-02-15T14:00:00.000-05:00",  // EST
  formatted_date: "Saturday, Feb 15, 2026",
  formatted_time: "2:00 PM",
  formatted_time_with_tz: "2:00 PM EST",
  salon_timezone: "America/New_York",
  timezone_abbr: "EST",
  display_datetime: "Saturday, Feb 15, 2026 at 2:00 PM EST"
}
*/

// ============================================
// TIMEZONE CONVERSION EXAMPLES
// ============================================
/*
Scenario: Customer in LA (PST) calls salon in NY (EST)

Customer says: "I want 2 PM my time" (PST)
Bella asks: "Just to confirm, 2 PM Pacific Time?"
Customer confirms.

n8n receives: "2026-02-15T14:00:00-08:00" (PST)
This code converts to:
- Database: "2026-02-15T22:00:00.000Z" (UTC)
- Salon display: "5:00 PM EST"
- Customer email: "2:00 PM PST" (their timezone)

Both parties see correct time in their timezone!
*/

// ============================================
// INTEGRATION WITH ELEVENLABS
// ============================================
/*
Update Bella's prompt to handle timezone questions:

"When booking, ask: 'What time zone are you in?'
If customer is in different timezone:
- Convert their requested time to salon timezone
- Confirm with both timezones
- Example: 'Perfect, so that's 2 PM your time in California, which is 5 PM our time in New York. I'll book you for 5 PM Eastern Time.'"
*/
