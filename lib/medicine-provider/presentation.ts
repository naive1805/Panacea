const PACK_NAME = /\bPack\s+\[([^\]]+)\]\s*$/i

/** Use the human-readable product label for RxNorm pack concepts. */
export function displayMedicineName(name: string): string {
  const packLabel = PACK_NAME.exec(name)?.[1]?.trim()
  const displayName = packLabel || name.trim()
  return displayName.length > 180 ? `${displayName.slice(0, 177).trimEnd()}…` : displayName
}

export function isMultiItemPack(name: string): boolean {
  return PACK_NAME.test(name)
}
