interface PageResult<T> {
  data: T[] | null;
  error: { message: string; code?: string } | null;
}

export async function readAll<T>(getPage: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getPage(from, from + pageSize - 1);
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export async function readAllByIds<T>(
  ids: readonly number[],
  getPage: (ids: number[], from: number, to: number) => PromiseLike<PageResult<T>>,
  batchSize = 100,
): Promise<T[]> {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError('batchSize debe ser un entero positivo.');
  }

  const rows: T[] = [];
  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize);
    rows.push(...(await readAll((from, to) => getPage(batch, from, to))));
  }
  return rows;
}
