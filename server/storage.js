import crypto from 'node:crypto'
import { supabase } from './db.js'

const BUCKET = 'uploads'

export async function uploadFile(file, folder) {
  const extension = file.mimetype === 'image/jpeg' ? '.jpg'
    : file.mimetype === 'image/png' ? '.png'
    : file.mimetype === 'image/webp' ? '.webp'
    : file.mimetype === 'application/pdf' ? '.pdf'
    : null
  if (!extension) throw new Error('Unsupported file type')

  const path = `${folder}/${crypto.randomUUID()}${extension}`
  const { error } = await supabase().storage.from(BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function signedFileUrl(path) {
  if (!path) return ''
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(path, 60 * 60)
  if (error) throw error
  return data.signedUrl
}

export async function removeFile(path) {
  if (!path) return
  const { error } = await supabase().storage.from(BUCKET).remove([path])
  if (error) throw error
}
