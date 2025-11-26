import type { NextApiRequest, NextApiResponse } from 'next';

const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;
const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_STREAM_COLLECTION_ID = process.env.BUNNY_STREAM_COLLECTION_ID;
const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY;
const BUNNY_STORAGE_BASE_URL = process.env.BUNNY_STORAGE_BASE_URL;

const sanitizeFilename = (filename: string) =>
  filename
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { type, filename, folder } = req.body;

    if (!type || !filename) {
      return res.status(400).json({ error: 'Missing required fields: type, filename' });
    }

    if (type === 'video') {
      // Create Bunny Stream video record
      if (!BUNNY_STREAM_LIBRARY_ID || !BUNNY_STREAM_API_KEY) {
        return res.status(500).json({ error: 'Bunny Stream not configured' });
      }

      const createResponse = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`,
        {
          method: 'POST',
          headers: {
            'AccessKey': BUNNY_STREAM_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `${folder || 'upload'}-${filename}`.slice(0, 250),
            collectionId: BUNNY_STREAM_COLLECTION_ID || undefined,
          }),
        }
      );

      const createPayload = await createResponse.json();

      if (!createResponse.ok || !createPayload?.guid) {
        return res.status(500).json({
          error: `Failed to create Bunny Stream video: ${createPayload?.message || createResponse.statusText}`,
        });
      }

      return res.status(200).json({
        libraryId: BUNNY_STREAM_LIBRARY_ID,
        videoGuid: createPayload.guid,
        uploadUrl: `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${createPayload.guid}`,
        apiKey: BUNNY_STREAM_API_KEY,
      });
    }

    if (type === 'image') {
      // Generate Bunny Storage upload URL
      if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_API_KEY || !BUNNY_STORAGE_BASE_URL) {
        return res.status(500).json({ error: 'Bunny Storage not configured' });
      }

      const sanitizedFolder = (folder || 'uploads').replace(/[^a-zA-Z0-9/_-]/g, '');
      const sanitizedFile = sanitizeFilename(filename);
      const objectName = `${sanitizedFolder}/${Date.now()}-${sanitizedFile}`;
      const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${objectName}`;
      const baseUrl = BUNNY_STORAGE_BASE_URL.replace(/\/$/, '');
      const publicUrl = `${baseUrl}/${objectName}`;

      return res.status(200).json({
        uploadUrl,
        publicUrl,
        objectName,
        apiKey: BUNNY_STORAGE_API_KEY,
      });
    }

    return res.status(400).json({ error: 'Invalid type. Must be "video" or "image"' });
  } catch (error: any) {
    console.error('Credentials generation error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate upload credentials',
    });
  }
}

