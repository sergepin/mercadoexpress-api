/**
 * Condición SQL para comparar texto sin distinguir mayúsculas ni acentos.
 * Requiere la extensión PostgreSQL `unaccent` (migración 1740000000002).
 */
export function normalizedTextEquals(column: string, parameter: string): string {
  return `unaccent(lower(trim(${column}))) = unaccent(lower(trim(:${parameter})))`;
}
