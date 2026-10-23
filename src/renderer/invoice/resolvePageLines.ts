import type { InvoiceLineItem } from '../../shared/domain/invoice';

export function resolvePageLines(
  pages: string[][],
  lines: InvoiceLineItem[],
): InvoiceLineItem[][] {
  const byId = new Map(lines.map((line) => [line.id, line]));
  return pages.map((ids) =>
    ids.flatMap((id) => {
      const line = byId.get(id);
      return line ? [line] : [];
    }),
  );
}
