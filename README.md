## only2u Admin Panel

Internal dashboard for managing products, orders, vendors, and user-generated content.

### Key Docs

- `START_HERE.md` – onboarding checklist
- `BUNNY_STREAM_SETUP.md` – configuring Bunny.net media uploads
- `ENV_SETUP_TEMPLATE.txt` – copy to `.env.local` for required env vars

### Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to access the admin UI.

### Media Uploads

- Videos are uploaded to Bunny Stream via `app/api/upload/bunny/route.ts`.
- Images and other assets are stored inside a Bunny Storage Zone.
- Client code uses `lib/uploadUtils.ts`.

### Deployment

The project targets Vercel by default. Adjust `vercel.json` to modify function limits or add rewrites as needed.
