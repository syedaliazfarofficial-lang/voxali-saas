// apply-fetch.js
async function run() {
    const res = await fetch("https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/apply-migration", {
        headers: { "Authorization": "Bearer LUXE-AUREA-SECRET-2026" }
    });
    console.log(res.status, await res.text());
}
run();
