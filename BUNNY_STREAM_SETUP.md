# Bunny Stream Integration

This admin panel now uses [Bunny.net](https://bunny.net) for all media handling:

- **Videos** are ingested into Bunny Stream for adaptive playback.
- **Images & other assets** are stored inside a Bunny Storage Zone and delivered through your pull zone CDN URL.

Follow the steps below to configure both services.

## 1. Create a Stream Library

1. Sign in to the Bunny dashboard and open **Stream → Video Libraries**.
2. Create a new library and note the following values:
   - **Library ID**
   - **API Key**
   - (Optional) **Collection ID** if you want uploads grouped automatically.
3. Under **Delivery**, pick the playback method you prefer:
   - Use the default iframe domain `https://iframe.mediadelivery.net/embed/{libraryId}`  
   - _or_ add your custom pull zone (recommended) and note the HTTPS hostname.

## 2. Create a Storage Zone for Images

1. Navigate to **Storage → Add Storage Zone** and choose a zone name (e.g. `only2u-media`).
2. Generate a **Storage API Key** from the zone’s **FTP & API Access** tab.
3. Create a **Pull Zone** that points to the storage zone so assets are served over HTTPS (e.g. `https://assets-only2u.b-cdn.net`).

## 3. Configure Environment Variables

Copy `ENV_SETUP_TEMPLATE.txt` to `.env.local` and fill in:

```
BUNNY_STREAM_LIBRARY_ID=...
BUNNY_STREAM_API_KEY=...
BUNNY_STREAM_COLLECTION_ID=...        # optional
BUNNY_STREAM_PLAYBACK_BASE_URL=https://vz-yourzone.b-cdn.net

BUNNY_STORAGE_ZONE=...
BUNNY_STORAGE_API_KEY=...
BUNNY_STORAGE_BASE_URL=https://assets-only2u.b-cdn.net
```

Restart the dev server after saving the file.

## 4. Upload Workflow Overview

| Type   | Destination            | Notes |
|--------|------------------------|-------|
| Video  | Bunny Stream           | Creates a video record, uploads binary, returns HLS/iframe URL |
| Image  | Bunny Storage Zone     | Stores as `{folder}/{timestamp}-{filename}` and returns CDN URL |

API route: `app/api/upload/bunny/route.ts`  
Client helper: `lib/uploadUtils.ts`

## 5. Deleting Assets

Deletion currently uses the `public_id` returned from uploads:
- Videos → deletes the Bunny Stream video GUID
- Images → deletes the storage object path

If you need UI support for deletion, persist both the `url` and `public_id` values.

## 6. Troubleshooting

- **403 Forbidden** on upload → verify API keys and that the Stream/Storage zones are active.
- **Playback URL 404** → confirm the playback base URL matches your pull zone and that the video finished processing (Bunny Stream may take a minute for new videos).
- **Large files timing out** → increase the Vercel function duration/memory or upload during off-peak hours; Bunny Stream supports files up to several hundred MBs.

Happy streaming! 🎬

