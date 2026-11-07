# Record Book V2 — Deployment Guide

Complete deployment instructions for Supabase Edge Functions + Vercel + Capacitor Android.

---

## Prerequisites

```bash
# 1. Install Supabase CLI
npm install -g supabase@latest

# 2. Install Vercel CLI
npm install -g vercel@latest

# 3. Login to both
supabase login
vercel login
```

---

## 1. Supabase Project Setup

### Link to existing project
```bash
cd /path/to/Record-Book
supabase link --project-ref xelxvojazyscbounzajs
```

### Verify database schema is applied
```bash
# Check if v2 tables exist
supabase db shell
# In psql:
\dt v2_*
# Should show: v2_accounts, v2_ledger_entries, v2_parties_dues, v2_credit_cards, v2_sheets, v2_notes, v2_vault_items, v2_workspaces
```

If tables missing, apply schema:
```bash
supabase db push
# Or manually in Supabase Dashboard > SQL Editor:
# Run contents of supabase_schema_v2.sql
```

---

## 2. Deploy Edge Functions

```bash
# Deploy all 10 functions
supabase functions deploy health --project-ref xelxvojazyscbounzajs
supabase functions deploy reconcile --project-ref xelxvojazyscbounzajs
supabase functions deploy summary --project-ref xelxvojazyscbounzajs
supabase functions deploy accounts --project-ref xelxvojazyscbounzajs
supabase functions deploy ledger --project-ref xelxvojazyscbounzajs
supabase functions deploy dues --project-ref xelxvojazyscbounzajs
supabase functions deploy credit-cards --project-ref xelxvojazyscbounzajs
supabase functions deploy sheets --project-ref xelxvojazyscbounzajs
supabase functions deploy notes --project-ref xelxvojazyscbounzajs
supabase functions deploy vault --project-ref xelxvojazyscbounzajs

# Or deploy all at once (if supported)
supabase functions deploy --project-ref xelxvojazyscbounzajs
```

### Set Function Secrets (if needed)
```bash
# Only if you need custom secrets beyond Supabase defaults
supabase secrets set CUSTOM_KEY=value --project-ref xelxvojazyscbounzajs
```

### Verify deployment
```bash
# Test each function
curl https://xelxvojazyscbounzajs.supabase.co/functions/v1/health
curl -X POST https://xelxvojazyscbounzajs.supabase.co/functions/v1/health
curl https://xelxvojazyscbounzajs.supabase.co/functions/v1/reconcile \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"remoteRecords":[],"localRecords":[],"confirmedCloudIds":[],"deletedTombstoneIds":[],"canonicalWorkspaceId":"test"}'
```

---

## 3. Vercel Deployment

### Environment Variables
Set in Vercel Dashboard > Project > Settings > Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xelxvojazyscbounzajs.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_1BG03u4BQDYfpV3nw99WKw_z0qen4Gi` | Production, Preview, Development |

### Deploy
```bash
cd /path/to/Record-Book
vercel --prod
```

### Verify
- Visit the deployed URL
- Test sign up / sign in
- Verify data syncs to Supabase
- Check Edge Function calls in Network tab

---

## 4. Capacitor Android Build

### Sync web assets
```bash
cd /path/to/Record-Book
npm run build
npx cap sync android
```

### Open in Android Studio
```bash
npx cap open android
```

### Build APK/AAB
In Android Studio:
1. **Build > Generate Signed Bundle / APK**
2. Choose **Android App Bundle** (for Play Store) or **APK** (for testing)
3. Select keystore (create new if first time)
4. Choose **release** build
5. Finish — output in `android/app/build/outputs/bundle/release/` or `apk/release/`

### Test on device
```bash
# Install debug APK directly
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or run from Android Studio (green play button)
```

---

## 5. Post-Deployment Verification Checklist

### Web App (Vercel)
- [ ] Homepage loads at production URL
- [ ] Sign up with email/password works
- [ ] Sign in works
- [ ] All 9 modules accessible via sidebar
- [ ] Quick Entry (Ctrl+N) works
- [ ] Command Palette (Ctrl+K) works
- [ ] Data persists after refresh
- [ ] Multi-device sync works (open on 2 browsers)
- [ ] Privacy mask (Hide ₹) toggles
- [ ] PIN lock works
- [ ] Charts render in Overview
- [ ] CSV exports work

### Edge Functions (Supabase)
- [ ] `GET /functions/v1/health` returns 200 + JSON
- [ ] `POST /functions/v1/accounts` creates account (with auth)
- [ ] `GET /functions/v1/accounts` lists accounts
- [ ] `POST /functions/v1/ledger` creates entry
- [ ] `POST /functions/v1/dues?action=settle` settles due
- [ ] `POST /functions/v1/credit-cards?action=spend` records spend
- [ ] `POST /functions/v1/credit-cards?action=pay_bill` pays bill
- [ ] `POST /functions/v1/notes?action=post_to_ledger` posts note
- [ ] Realtime updates work (edit on web → appears on mobile)

### Android App (Capacitor)
- [ ] App installs and launches
- [ ] Splash screen shows
- [ ] Sign in works
- [ ] All modules navigate correctly
- [ ] Bottom nav bar works (6 slots + More drawer)
- [ ] Offline mode: create entry offline → syncs when online
- [ ] PIN lock works
- [ ] Biometric unlock (if configured)
- [ ] Push notifications (if configured)

---

## 6. Troubleshooting

### Edge Functions return 401 Unauthorized
```bash
# Check JWT verification is enabled in supabase/config.toml
# [functions.accounts] verify_jwt = true
# Ensure frontend sends Authorization: Bearer <access_token>
```

### CORS errors on Edge Functions
```bash
# Functions run on same domain (supabase.co) so CORS shouldn't be an issue
# If calling from localhost, ensure Supabase project allows localhost origin
```

### Vercel build fails
```bash
# Check package.json has correct build script
# Ensure next.config.ts output: 'export' for static hosting
# Run locally: npm run build && npx serve out
```

### Android build fails
```bash
# Clean and rebuild
cd android && ./gradlew clean && cd ..
npm run build
npx cap sync android
```

### Realtime not syncing
```bash
# Check Supabase Dashboard > Replication > Publications
# Ensure v2_* tables are in supabase_realtime publication
# Check browser console for channel subscription errors
```

---

## 7. Monitoring & Logs

### Edge Function Logs
```bash
# Stream logs
supabase functions logs health --project-ref xelxvojazyscbounzajs
supabase functions logs accounts --project-ref xelxvojazyscbounzajs
# Follow mode
supabase functions logs accounts --follow --project-ref xelxvojazyscbounzajs
```

### Supabase Dashboard
- **Functions** tab: invocation count, errors, latency
- **Database** > **Logs**: Postgres query logs
- **Auth** > **Logs**: sign in/up events
- **Realtime** > **Messages**: broadcast events

### Vercel Dashboard
- **Functions** tab: serverless function invocations
- **Analytics**: page views, performance
- **Logs**: build + runtime logs

---

## 8. Rollback Procedure

### Edge Functions
```bash
# View deployment history
supabase functions list --project-ref xelxvojazyscbounzajs

# Re-deploy previous version (manual - keep git history)
git checkout <previous-commit> -- supabase/functions/
supabase functions deploy --project-ref xelxvojazyscbounzajs
```

### Vercel
- Dashboard > Deployments > Click "..." on previous deployment > "Promote to Production"

### Android
- Keep signed AAB/APK artifacts in CI/CD or local archive
- Re-upload previous version to Play Console

---

## 9. CI/CD Automation (Optional)

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-vercel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 10. Support Contacts

| Component | Support |
|-----------|---------|
| Supabase Edge Functions | https://supabase.com/docs/guides/functions |
| Vercel Deployment | https://vercel.com/docs |
| Capacitor Android | https://capacitorjs.com/docs/android |
| Recharts | https://recharts.org/en-US/ |
| Framer Motion | https://www.framer.com/motion/ |

---

**Last updated:** 2026-11-07  
**Version:** 2.0.0 (Daylight Edition)