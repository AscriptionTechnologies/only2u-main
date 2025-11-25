import type { NextApiRequest, NextApiResponse } from 'next';
import type { Fields, Files, File as FormidableFile } from 'formidable';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';

type UploadResult = {
  url: string;
  public_id: string;
  size: number;
};

const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;
const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_STREAM_COLLECTION_ID = process.env.BUNNY_STREAM_COLLECTION_ID;
const BUNNY_STREAM_PLAYBACK_BASE_URL = process.env.BUNNY_STREAM_PLAYBACK_BASE_URL;

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE;
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY;
const BUNNY_STORAGE_BASE_URL = process.env.BUNNY_STORAGE_BASE_URL;

const allowedImageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const allowedVideoTypes = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '600mb',
  },
};

const sanitizeFilename = (filename: string) =>
  filename
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '');

const ensureEnv = () => {
  if (!BUNNY_STREAM_LIBRARY_ID || !BUNNY_STREAM_API_KEY) {
    throw new Error(
      'Bunny Stream configuration missing. Please set BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY.'
    );
  }

  if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_API_KEY || !BUNNY_STORAGE_BASE_URL) {
    throw new Error(
      'Bunny Storage configuration missing. Please set BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY and BUNNY_STORAGE_BASE_URL.'
    );
  }
};

const parseForm = async (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> => {
  const formidable = (await import('formidable')).default;
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 600 * 1024 * 1024,
    allowEmptyFiles: false,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
};

const getUploadedFile = (files: Files): FormidableFile | undefined => {
  const fileField = files.file;
  if (!fileField) return undefined;
  return Array.isArray(fileField) ? fileField[0] : (fileField as FormidableFile);
};

const getFieldValue = (value: Fields[keyof Fields]): string | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : (value as string);
};

const uploadToBunnyStorage = async (file: FormidableFile, folder: string): Promise<UploadResult> => {
  const sanitizedFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
  const fileName = sanitizeFilename(file.originalFilename || 'upload');
  const objectName = `${sanitizedFolder}/${Date.now()}-${fileName}`;
  const storageUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${objectName}`;
  const stream = createReadStream(file.filepath);

  const response = await fetch(storageUrl, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_STORAGE_API_KEY as string,
      'Content-Type': file.mimetype || 'application/octet-stream',
    },
    body: stream as any,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload file to Bunny Storage: ${errorText}`);
  }

  const baseUrl = (BUNNY_STORAGE_BASE_URL as string).replace(/\/$/, '');

  return {
    url: `${baseUrl}/${objectName}`,
    public_id: objectName,
    size: file.size || 0,
  };
};

const createBunnyStreamVideo = async (file: FormidableFile, folder: string): Promise<UploadResult> => {
  const createResponse = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`,
    {
      method: 'POST',
      headers: {
        AccessKey: BUNNY_STREAM_API_KEY as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `${folder}-${file.originalFilename || 'video'}`.slice(0, 250),
        collectionId: BUNNY_STREAM_COLLECTION_ID || undefined,
      }),
    }
  );

  const createPayload = await createResponse.json();

  if (!createResponse.ok || !createPayload?.guid) {
    throw new Error(
      `Failed to create Bunny Stream video: ${createPayload?.message || createResponse.statusText}`
    );
  }

  const stream = createReadStream(file.filepath);

  const uploadResponse = await fetch(
    `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${createPayload.guid}`,
    {
      method: 'PUT',
      headers: {
        AccessKey: BUNNY_STREAM_API_KEY as string,
        'Content-Type': 'application/octet-stream',
      },
      body: stream as any,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload video to Bunny Stream: ${errorText}`);
  }

  const playbackBase =
    (BUNNY_STREAM_PLAYBACK_BASE_URL || '').replace(/\/$/, '') ||
    `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}`;

  const url = playbackBase.includes('mediadelivery.net/embed')
    ? `${playbackBase}/${createPayload.guid}`
    : `${playbackBase}/${createPayload.guid}/playlist.m3u8`;

  return {
    url,
    public_id: createPayload.guid,
    size: file.size || 0,
  };
};

const readJsonBody = async <T>(req: NextApiRequest): Promise<T> => {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as T) : ({} as T);
};

const safeUnlink = async (path?: string) => {
  if (!path) return;
  try {
    await unlink(path);
  } catch {
    // ignore cleanup errors
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    ensureEnv();

    if (req.method === 'POST') {
      const { fields, files } = await parseForm(req);
      const uploadedFile = getUploadedFile(files);

      if (!uploadedFile) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const folder = getFieldValue(fields.folder) || 'uploads';
      const requestedResourceType = (getFieldValue(fields.resourceType) || 'auto').toLowerCase();
      const mimetype = uploadedFile.mimetype || '';
      const size = uploadedFile.size || 0;
      const isVideo = mimetype.startsWith('video/');
      const isImage = mimetype.startsWith('image/');

      const maxSize = isVideo ? 500 * 1024 * 1024 : 25 * 1024 * 1024;

      if (size > maxSize) {
        await safeUnlink(uploadedFile.filepath);
        return res.status(400).json({
          error: `File size too large. Maximum size is ${Math.floor(maxSize / (1024 * 1024))}MB`,
        });
      }

      if (isImage && !allowedImageTypes.includes(mimetype)) {
        await safeUnlink(uploadedFile.filepath);
        return res
          .status(400)
          .json({ error: 'Invalid image type. Please upload JPEG, PNG, WebP or GIF files.' });
      }

      if (isVideo && !allowedVideoTypes.includes(mimetype)) {
        await safeUnlink(uploadedFile.filepath);
        return res
          .status(400)
          .json({ error: 'Invalid video type. Please upload MP4, WebM, OGG or MOV files.' });
      }

      const shouldHandleAsVideo =
        requestedResourceType === 'video' || (requestedResourceType !== 'image' && isVideo);

      try {
        const result = shouldHandleAsVideo
          ? await createBunnyStreamVideo(uploadedFile, folder)
          : await uploadToBunnyStorage(uploadedFile, folder);

        await safeUnlink(uploadedFile.filepath);

        return res.status(200).json({
          success: true,
          url: result.url,
          public_id: result.public_id,
          size: result.size,
          resource_type: shouldHandleAsVideo ? 'video' : 'image',
        });
      } catch (uploadError: any) {
        await safeUnlink(uploadedFile.filepath);
        throw uploadError;
      }
    }

    if (req.method === 'DELETE') {
      const { public_id, resource_type } = await readJsonBody<{
        public_id?: string;
        resource_type?: string;
      }>(req);

      if (!public_id) {
        return res.status(400).json({ error: 'No public_id provided' });
      }

      if (resource_type === 'video') {
        const response = await fetch(
          `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${public_id}`,
          {
            method: 'DELETE',
            headers: {
              AccessKey: BUNNY_STREAM_API_KEY as string,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to delete Bunny Stream video: ${errorText}`);
        }
      } else {
        const response = await fetch(
          `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${public_id}`,
          {
            method: 'DELETE',
            headers: {
              AccessKey: BUNNY_STORAGE_API_KEY as string,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to delete Bunny Storage asset: ${errorText}`);
        }
      }

      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).end('Method Not Allowed');
  } catch (error: any) {
    console.error('Bunny upload error:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Failed to handle Bunny upload request' });
  }
}

