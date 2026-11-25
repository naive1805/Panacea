const PACK_NAME = /\bPack\s+\[([^\]]+)\]\s*$/i

/** Use the human-readable product label for RxNorm pack concepts. */
export function displayMedicineName(name: string): string {
  const value = name.trim()
  const packLabel = PACK_NAME.exec(value)?.[1]?.trim()
  const genericLabel = /^(.*?)\s+\[[^\]]+\]\s*$/.exec(value)?.[1]?.trim()
  const displayName = packLabel || genericLabel || value
  return displayName.length > 180 ? `${displayName.slice(0, 177).trimEnd()}…` : displayName
}

export function isMultiItemPack(name: string): boolean {
  return PACK_NAME.test(name)
}
