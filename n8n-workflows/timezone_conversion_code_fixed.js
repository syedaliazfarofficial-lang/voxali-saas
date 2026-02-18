// ============================================
// TIMEZONE CONVERSION (Native JavaScript - No External Libraries)
// ============================================
// This version works in n8n without requiring luxon

const input = $input.first().json;

// Salon timezone offset (CST = UTC-6, CDT = UTC-5 in summer)
// For Chicago: -6 hours in winter, -5 hours in summer (DST)
const SALON_TIMEZONE = 'America/Chicago';
const TIMEZONE_OFFSET_HOURS = -6; // CST (adjust to -5 for CDT in summer)

// Parse the incoming datetime
if (!input.start_at) {
    return { json: input };
}

// Convert to Date object
let dateObj = new Date(input.start_at);

// Check if valid
if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid datetime format: ${input.start_at}`);
}

// Format functions
function formatDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
}

function formatTime(date) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

// Get UTC ISO string
const utcISO = dateObj.toISOString();

// Convert to salon local time
const localDate = new Date(dateObj.getTime() + (TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000));

// Format outputs
const formattedDate = formatDate(localDate);
const formattedTime = formatTime(localDate);
const timezoneAbbr = 'CST'; // Hardcoded for now (or 'CDT' in summer)

// Return result
return {
    json: {
        ...input,
        start_at: utcISO,  // Store in UTC
        start_at_local: dateObj.toISOString(), // Local ISO
        formatted_date: formattedDate,
        formatted_time: formattedTime,
        formatted_time_with_tz: `${formattedTime} ${timezoneAbbr}`,
        salon_timezone: SALON_TIMEZONE,
        timezone_abbr: timezoneAbbr,
        display_datetime: `${formattedDate} at ${formattedTime} ${timezoneAbbr}`
    }
};
