export interface MeasuredItem {
  id: string;
  height: number;
}

/** Assigns intact rows to pages; an individually oversized row gets its own page. */
export function assignMeasuredPages<T extends MeasuredItem>(
  items: T[],
  availableHeight: number,
): T[][] {
  const capacity = Math.max(1, availableHeight);
  const pages: T[][] = [];
  let page: T[] = [];
  let used = 0;
  for (const item of items) {
    if (page.length > 0 && used + item.height > capacity) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(item);
    used += item.height;
    if (item.height > capacity) {
      pages.push(page);
      page = [];
      used = 0;
    }
  }
  if (page.length || pages.length === 0) pages.push(page);
  return pages;
}
