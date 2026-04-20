export function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40)
}

export function slugify(value: string) {
  return normalizeSlug(value).replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}
