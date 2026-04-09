const fs = require('fs');

async function main() {
    const filePath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/src/components/Settings.tsx';
    let code = fs.readFileSync(filePath, 'utf8');

    // 1. Remove contact info & public review link states from IntegrationsTab
    code = code.replace(/const \[salonEmail, setSalonEmail\] = useState\(''\);\s*const \[salonWebsite, setSalonWebsite\] = useState\(''\);\s*const \[googleReviewUrl, setGoogleReviewUrl\] = useState\(''\);/g, '');

    // 2. Remove their fetch inside IntegrationsTab
    code = code.replace(/setSalonEmail\(data\.salon_email \|\| ''\);\s*setSalonWebsite\(data\.salon_website \|\| ''\);\s*setGoogleReviewUrl\(data\.google_review_url \|\| ''\);/g, '');

    // 3. Remove their update inside IntegrationsTab
    code = code.replace(/salon_email: salonEmail \|\| null,\s*salon_website: salonWebsite \|\| null,\s*google_review_url: googleReviewUrl \|\| null,/g, '');

    // 4. Remove contact info & public review link UI from IntegrationsTab
    // Match from {/* Salon Contact Info */} to just before {/* Save Button */}
    const uiRegex = /\{\/\* Salon Contact Info \*\/\}.+?(?=\{\/\* Save Button \*\/\})/s;
    const matchedUI = code.match(uiRegex);
    if (matchedUI) {
        code = code.replace(uiRegex, '');
    }

    // 5. Add those states into the main Settings component
    const loyaltyStateRegex = /const \[loyaltyMultiplier, setLoyaltyMultiplier\] = useState<number>\(1\.0\);\s*const \[loyaltySaving, setLoyaltySaving\] = useState\(false\);/;
    code = code.replace(loyaltyStateRegex, "const [loyaltyMultiplier, setLoyaltyMultiplier] = useState<number>(1.0);\n    const [loyaltySaving, setLoyaltySaving] = useState(false);\n\n    const [salonEmail, setSalonEmail] = useState('');\n    const [salonWebsite, setSalonWebsite] = useState('');\n    const [googleReviewUrl, setGoogleReviewUrl] = useState('');");

    // 6. Update the main fetchAll to get these values
    const fetchAllRegex = /\.select\('loyalty_points_multiplier'\)/;
    code = code.replace(fetchAllRegex, ".select('loyalty_points_multiplier, salon_email, salon_website, google_review_url')");

    const fetchAllSetRegex = /if \(tenantData\?.loyalty_points_multiplier !== undefined\) setLoyaltyMultiplier\(tenantData\.loyalty_points_multiplier\);/;
    code = code.replace(fetchAllSetRegex, "if (tenantData) {\n            if (tenantData.loyalty_points_multiplier !== undefined) setLoyaltyMultiplier(tenantData.loyalty_points_multiplier);\n            setSalonEmail(tenantData.salon_email || '');\n            setSalonWebsite(tenantData.salon_website || '');\n            setGoogleReviewUrl(tenantData.google_review_url || '');\n        }");

    // 7. Update handleSaveBranding to also save these values
    const saveBrandingRegex = /const ok = await updateBranding\(updates\);/;
    code = code.replace(saveBrandingRegex, "await supabaseAdmin.from('tenants').update({ salon_email: salonEmail || null, salon_website: salonWebsite || null, google_review_url: googleReviewUrl || null }).eq('id', tenantId);\n\n        const ok = await updateBranding(updates);");

    // 8. Inject the Contact Info UI into the General Tab
    const loyaltyUIRegex = /\{\/\* ============ LOYALTY PROGRAM SETTINGS ============ \*\/\}/;
    
    const contactInfoUI = "\n                    {/* ============ SALON CONTACT INFO ============ */}\n" +
        "                    <div className=\"flex items-center gap-3 mt-10 mb-6\">\n" +
        "                        <div className=\"p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20\">\n" +
        "                            <Mail className=\"w-6 h-6 text-luxe-gold\" />\n" +
        "                        </div>\n" +
        "                        <div>\n" +
        "                            <h3 className=\"text-xl font-bold\">Salon Contact Info</h3>\n" +
        "                            <p className=\"text-xs text-white/40 uppercase tracking-widest\">Shown in emails & notifications</p>\n" +
        "                        </div>\n" +
        "                    </div>\n\n" +
        "                    <div className=\"glass-panel border border-white/5 p-6 mb-6\">\n" +
        "                        <div className=\"space-y-4\">\n" +
        "                            <div>\n" +
        "                                <label className=\"text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block\">Salon Email</label>\n" +
        "                                <input\n" +
        "                                    value={salonEmail} onChange={e => setSalonEmail(e.target.value)}\n" +
        "                                    placeholder=\"info@yoursalon.com\"\n" +
        "                                    className=\"w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all\"\n" +
        "                                />\n" +
        "                            </div>\n" +
        "                            <div>\n" +
        "                                <label className=\"text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block\">Website</label>\n" +
        "                                <input\n" +
        "                                    value={salonWebsite} onChange={e => setSalonWebsite(e.target.value)}\n" +
        "                                    placeholder=\"https://www.yoursalon.com\"\n" +
        "                                    className=\"w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all\"\n" +
        "                                />\n" +
        "                            </div>\n" +
        "                            <div>\n" +
        "                                <label className=\"text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block\">Google Review Link</label>\n" +
        "                                <input\n" +
        "                                    value={googleReviewUrl} onChange={e => setGoogleReviewUrl(e.target.value)}\n" +
        "                                    placeholder=\"https://g.page/r/your-salon/review\"\n" +
        "                                    className=\"w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all\"\n" +
        "                                />\n" +
        "                                <p className=\"text-xs text-white/30 mt-2\">Shown in \\\"Thank You\\\" emails — clients can rate your salon on Google.</p>\n" +
        "                            </div>\n" +
        "                        </div>\n" +
        "                        <button\n" +
        "                            onClick={handleSaveBranding}\n" +
        "                            disabled={brandingSaving}\n" +
        "                            className=\"bg-gold-gradient text-luxe-obsidian px-8 py-3 w-full rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50\"\n" +
        "                        >\n" +
        "                            {brandingSaving ? <Loader2 className=\"w-4 h-4 animate-spin\" /> : <Save className=\"w-4 h-4\" />}\n" +
        "                            {brandingSaving ? 'SAVING...' : 'SAVE SETTINGS'}\n" +
        "                        </button>\n" +
        "                    </div>\n\n";

    code = code.replace(loyaltyUIRegex, contactInfoUI + '{/* ============ LOYALTY PROGRAM SETTINGS ============ */}');

    fs.writeFileSync(filePath, code, 'utf8');
    console.log("Refactoring complete");
}

main().catch(console.error);
