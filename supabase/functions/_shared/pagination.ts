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
