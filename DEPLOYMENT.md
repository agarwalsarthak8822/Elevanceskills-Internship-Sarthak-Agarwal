# YourTube 2.0 — Deployment Guide

This guide walks through running YourTube 2.0 locally and deploying it publicly:
the **frontend (Next.js)** to **Vercel** and the **backend (Express + Socket.io)**
to **Render** (Railway works the same way). A public live URL is required for
submission, and everything below is designed to give you one.

The repository has two apps:

| App | Folder | Stack | Deploy target |
| --- | --- | --- | --- |
| Frontend | `yourtube/` | Next.js 15, React 19, Tailwind | Vercel |
| Backend | `server/` | Express 5, Socket.io, MongoDB | Render / Railway |

---

## 1. What each internship task needs

Every feature works with graceful dev fallbacks, but for a real public deployment
you should provide the keys below. Each row shows which task the key unlocks.

| Task | Feature | Keys required |
| --- | --- | --- |
| 1 | Comment translator, city display, dislike auto-remove | none (uses public Lingva/LibreTranslate; optional `LIBRETRANSLATE_*`) |
| 2 | Video downloads + 1/day free limit | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (for premium unlimited) |
| 3 | Plans (Bronze/Silver/Gold), watch-time limits, invoice email | `RAZORPAY_*`, `EMAIL_USER`, `EMAIL_PASS` |
| 4 | Time+region theme, email OTP (South India) / mobile OTP (rest) | `EMAIL_*` for email OTP; `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` for SMS OTP |
| 5 | Touch gestures on the video player | none (pure client-side) |
| 6 | Friend video calls, screen share, local recording | `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` |

Auth (Google / email-password) uses **Firebase** and is shared across tasks.

---

## 2. Create the third-party accounts

You only need the accounts for the features you want live. Free tiers are enough.

1. **MongoDB Atlas** — create a free cluster, a database user, and allow network
   access from `0.0.0.0/0`. Copy the connection string → `DB_URL`.
2. **Firebase** — create a project, enable **Authentication → Google** and
   **Email/Password**. From *Project settings → Your apps (Web)* copy the config
   values into the `NEXT_PUBLIC_FIREBASE_*` frontend vars and the Web API key into
   the backend `FIREBASE_API_KEY`.
3. **Razorpay** (Tasks 2 & 3) — sign up, stay in **Test mode**, and from
   *Account & Settings → API Keys* generate a key pair → `RAZORPAY_KEY_ID` and
   `RAZORPAY_KEY_SECRET`. Both must be from the same pair.
4. **Gmail** (Tasks 3 & 4 email) — enable 2-Step Verification, then create an
   **App Password** at https://myaccount.google.com/apppasswords →
   `EMAIL_USER` (your address) and `EMAIL_PASS` (the 16-char app password).
5. **Twilio** (Tasks 4 & 6):
   - SMS OTP: from the Console copy **Account SID** and **Auth Token**, and buy/
     use a trial phone number → `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
     `TWILIO_PHONE_NUMBER`.
   - Video: under *Account → API keys & tokens* create an **API Key** →
     `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` (same Account SID as above).

---

## 3. Run it locally first

From the repository root (`you_tube2.0-main/`):

**Backend**

```bash
cd server
cp .env.example .env         # then edit .env with your real values
npm install
npm start                    # starts on http://localhost:5000
```

**Frontend** (in a second terminal)

```bash
cd yourtube
cp .env.example .env.local   # then edit .env.local
# For local dev, set NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
npm install
npm run dev                  # starts on http://localhost:3000
```

Open http://localhost:3000. If a key is missing, that feature degrades safely
(e.g. OTP codes print to the backend terminal instead of being sent).

---

## 4. Deploy the backend to Render

1. Push this repo to GitHub.
2. On https://render.com → **New → Web Service** → connect the repo.
3. Configure:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free is fine for a demo.
4. Add **Environment Variables** — copy every key from `server/.env.example`
   with your real values. Important ones:
   - `DB_URL`, `JWT_SECRET`, `FIREBASE_API_KEY`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
   - `EMAIL_USER`, `EMAIL_PASS`
   - `TWILIO_*`
   - Leave `CLIENT_URLS` empty for now — you'll set it after step 5.
5. Deploy. Note the public URL, e.g. `https://yourtube-api.onrender.com`.
6. Visit that URL — you should see "You tube backend is working".

> **Uploaded videos & downloads note:** the backend serves and streams video
> files from the local `uploads/` folder. Render's free filesystem is
> **ephemeral** — files uploaded after deploy are wiped on the next redeploy.
> For a persistent demo, attach a Render **Persistent Disk** mounted at
> `server/uploads`, or move storage to a cloud bucket (S3/Cloudinary). Task 2
> downloads stream from this same folder, so the same applies.

---

## 5. Deploy the frontend to Vercel

1. On https://vercel.com → **Add New → Project** → import the same repo.
2. Configure:
   - **Root Directory:** `yourtube`
   - Framework preset: **Next.js** (auto-detected). Build/Output are automatic.
3. Add **Environment Variables** from `yourtube/.env.example`:
   - `NEXT_PUBLIC_BACKEND_URL` = your Render URL from step 4
     (e.g. `https://yourtube-api.onrender.com`)
   - all `NEXT_PUBLIC_FIREBASE_*` values
4. Deploy. Note your public URL, e.g. `https://yourtube.vercel.app`.

---

## 6. Wire the two together (do not skip)

1. **Backend CORS/sockets → allow the Vercel origin.** On Render, set
   `CLIENT_URLS` to your Vercel URL (comma-separate multiple), then redeploy:
   ```
   CLIENT_URLS=https://yourtube.vercel.app
   ```
   Without this, API calls and the video-call socket connection are blocked by
   CORS.
2. **Firebase authorized domains.** In Firebase *Authentication → Settings →
   Authorized domains*, add your Vercel domain (e.g. `yourtube.vercel.app`) so
   Google sign-in works in production.
3. **Razorpay:** test payments use card `4111 1111 1111 1111`, any future expiry,
   any CVV/OTP. Keep the account in Test mode for the demo.

Reload the Vercel URL — sign-in, payments, OTP, downloads, and calls should now
all work end-to-end.

---

## 7. Quick production checklist

- [ ] Backend live on Render, root shows the working message
- [ ] `CLIENT_URLS` on the backend includes the exact Vercel URL
- [ ] `NEXT_PUBLIC_BACKEND_URL` on the frontend points to the Render URL
- [ ] Firebase authorized domains include the Vercel domain
- [ ] `JWT_SECRET` set to a long random string (not the dev default)
- [ ] Razorpay in Test mode with a valid key pair
- [ ] (If used) Persistent disk mounted at `server/uploads` for video files
- [ ] Sign in, upload/play a video, run a test payment, send an OTP, start a call

---

## 8. Common issues

| Symptom | Fix |
| --- | --- |
| CORS error in browser console | Add the Vercel URL to `CLIENT_URLS` on the backend and redeploy |
| Google sign-in popup closes with `auth/unauthorized-domain` | Add the Vercel domain to Firebase authorized domains |
| OTP never arrives | Check `EMAIL_*` (email) or `TWILIO_*` (SMS); without them codes print to the backend logs |
| Payment "signature verification failed" | `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` must be from the same pair |
| Video plays but download opens a new tab | Ensure you're hitting the deployed backend (`NEXT_PUBLIC_BACKEND_URL`), not a stale localhost |
| Uploaded videos disappear after redeploy | Render free disk is ephemeral — attach a persistent disk or use cloud storage |
| Video call connects but no media | Twilio Video keys (`TWILIO_API_KEY_SID/SECRET`) must be set on the backend |
