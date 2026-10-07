export interface MeasuredItem {
  id: string;
  height: number;
}

export interface PageCapacities {
  first: number;
  firstFinal?: number;
  continuation: number;
  final: number;
}

export interface MeasuredPages<T> {
  pages: T[][];
  oversizedItemIds: string[];
}

/** Assigns intact rows using separate first, continuation, and closing capacities. */
export function assignMeasuredPages<T extends MeasuredItem>(
  items: T[],
  capacities: PageCapacities,
): MeasuredPages<T> {
  if (items.length === 0) return { pages: [[]], oversizedItemIds: [] };

  const pages: T[][] = [];
  let remaining = [...items];

  while (remaining.length > 0) {
    const pageIndex = pages.length;
    const remainingHeight = remaining.reduce(
      (sum, item) => sum + item.height,
      0,
    );
    const capacity =
      pageIndex === 0 &&
      remainingHeight <= (capacities.firstFinal ?? capacities.final)
        ? (capacities.firstFinal ?? capacities.final)
        : pageIndex === 0
          ? capacities.first
          : remainingHeight <= capacities.final
            ? capacities.final
            : capacities.continuation;
    const page: T[] = [];
    let used = 0;

    while (remaining.length > 0) {
      const next = remaining[0];
      const finalCapacity =
        pageIndex === 0
          ? (capacities.firstFinal ?? capacities.final)
          : capacities.final;
      if (
        remaining.length === 1 &&
        page.length > 0 &&
        used + next.height > finalCapacity
      ) {
        break;
      }
      if (page.length > 0 && used + next.height > Math.max(0, capacity)) break;
      page.push(next);
      remaining = remaining.slice(1);
      used += next.height;
      if (next.height > Math.max(0, capacity)) break;
    }
    pages.push(page);
  }

  const oversizedItemIds = pages.flatMap((page, pageIndex) => {
    const pageCapacity =
      pages.length === 1
        ? (capacities.firstFinal ?? capacities.final)
        : pageIndex === 0
          ? capacities.first
          : pageIndex === pages.length - 1
            ? capacities.final
            : capacities.continuation;
    return page
      .filter((item) => item.height > Math.max(0, pageCapacity))
      .map((item) => item.id);
  });
  return { pages, oversizedItemIds };
}
