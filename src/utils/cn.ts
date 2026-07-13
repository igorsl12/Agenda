// utils/cn.ts — helper trivial para concatenar classes condicionalmente.
// (Evita dependência extra de 'clsx'/'tailwind-merge' no protótipo.)
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
