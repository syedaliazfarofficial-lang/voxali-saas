// reset-password.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://sjzxgjimbcoqsylrglkm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePassword() {
    const email = 'syedaliazfarofficial@gmail.com';
    const newPassword = 'Password123!';

    // Get the user by email
    const { data: usersData, error: listUserError } = await supabase.auth.admin.listUsers();

    if (listUserError) {
        console.error("Error fetching users:", listUserError);
        return;
    }

    const user = usersData.users.find(u => u.email === email);

    if (!user) {
        console.error(`User with email ${email} not found.`);
        return;
    }

    console.log(`Found user: ${user.id}. Updating password...`);

    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
    );

    if (error) {
        console.error("Failed to update password:", error);
    } else {
        console.log("SUCCESS! Password updated to:", newPassword);
    }
}

updatePassword();
