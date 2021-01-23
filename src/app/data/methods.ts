import * as bcrypt from 'bcrypt'

/**
 *
 * @param raw RawPassword in string format
 */
export async function hashPassword(raw: string): Promise<string> {
  return await bcrypt.hash(raw, 2)
}

/**
 *
 * @param raw RawPassword in string format
 * @param hash Password hash in string format
 */
export async function verifyPassword(
  raw: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(raw, hash)
}
