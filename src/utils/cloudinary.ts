// Simple Cloudinary unsigned upload helper
// Requires env: VITE_CLOUDINARY_CLOUD_NAME and preset: employee_uploads

export interface CloudinaryUploadOptions {
  folder?: string;
  presetsName?: string; // optional override; defaults to employee_uploads
}

export async function uploadToCloudinary(file: File, options: CloudinaryUploadOptions = {}): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
  const presetFromEnv = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string) || 'employee_uploads';
  const uploadPreset = options.presetsName || presetFromEnv;
  if (!cloudName) {
    throw new Error('Missing VITE_CLOUDINARY_CLOUD_NAME environment variable');
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  if (options.folder) {
    form.append('folder', options.folder);
  }

  const response = await fetch(url, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudinary upload failed: ${text}`);
  }

  const data = await response.json();
  // secure_url preferred
  return data.secure_url || data.url;
}

export async function uploadManyToCloudinary(files: File[], options: CloudinaryUploadOptions = {}): Promise<string[]> {
  const uploads = files.map((file) => uploadToCloudinary(file, options));
  return Promise.all(uploads);
}


