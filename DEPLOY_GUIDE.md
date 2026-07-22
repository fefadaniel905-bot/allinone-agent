# Deploy Guide — Allinone Trust WhatsApp Agent ($0 stack)

Stack: Next.js (Vercel) + Supabase (free) + Gemini API (free tier).

## 1. Supabase (database)

1. Go to supabase.com → New Project → free tier. Save your DB password somewhere.
2. Once created: **Project Settings → API** — copy:
   - `Project URL` → this is `SUPABASE_URL`
   - `service_role` key (NOT `anon`) → this is `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **SQL Editor → New Query**, paste the contents of `supabase.sql`, click Run.
4. Confirm: **Table Editor → businesses** should show one test row (`sarah-cakes`). Edit or delete it, and add a row per real client.

## 2. Gemini API key (free)

1. Go to aistudio.google.com/apikey
2. Click "Create API key" → select or create a Google Cloud project → copy the key. This is `GEMINI_API_KEY`.
3. No credit card needed for the free tier. Note: free-tier models change often — this project currently uses `gemini-2.5-flash-lite`. Check ai.google.dev/gemini-api/docs/pricing before launch in case the free lineup has shifted again.

## 3. Push code to GitHub

```bash
cd whatsapp-agent
git init
git add .
git commit -m "Multi-tenant WhatsApp agent"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-agent.git
git push -u origin main
```

(You already do this workflow for allinone trust sites — same pattern.)

## 4. Deploy to Vercel

1. vercel.com → Add New Project → Import the GitHub repo you just pushed.
2. Framework preset: Next.js (auto-detected).
3. Before clicking Deploy, open **Environment Variables** and add all three from your `.env` file:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
4. Click Deploy. Once done you'll get a URL like `https://whatsapp-agent-yourname.vercel.app`.
5. Your live endpoint is: `https://whatsapp-agent-yourname.vercel.app/api/whatsapp`

## 5. Test it (before connecting WhatsApp)

```bash
curl -X POST https://whatsapp-agent-yourname.vercel.app/api/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"userMessage": "How much is a chocolate cake?", "business_id": "sarah-cakes"}'
```

Expected response:
```json
{"reply": "Chocolate cake is N$150!", "business_id": "sarah-cakes", "business_name": "Sarah's Cakes"}
```

If you get a 404, double-check `business_id` matches a row in Supabase exactly.

## 6. Connecting to actual WhatsApp

This endpoint returns the AI's reply text — it does not send WhatsApp messages itself yet. To actually receive/send WhatsApp messages you need a WhatsApp-side webhook provider in front of this route. Two realistic $0-friendly options:

- **WhatsApp Cloud API (Meta, official)** — free tier for the first 1,000 conversations/month, but requires Meta Business verification, which can take days and sometimes requires a registered business.
- **Twilio WhatsApp Sandbox** — free for testing/dev (not production-ready without a paid number), fastest to get a demo working today.

Either way, the wiring is the same: WhatsApp provider → sends incoming message to a webhook you control → your webhook calls `/api/whatsapp` with `{userMessage, business_id}` → takes the `reply` field → sends it back via the provider's send-message API.

**I did not build that webhook layer here** since it depends on which provider you pick and needs its own credentials/setup — happy to build it once you tell me which one (Cloud API vs Twilio).

## 7. Onboarding a new business (repeatable, no code changes)

Just insert a new row into `businesses`:
```sql
insert into businesses (business_id, name, business_info, owner_whatsapp)
values ('benji-auto', 'Benji Auto Repair', 'Car repairs, oil changes N$300, brake pads N$450. Open Mon-Fri 7am-6pm, Sat 8am-1pm. Location: Rundu.', '+264811112222');
```
That business is live on the same endpoint immediately — no redeploy needed.
