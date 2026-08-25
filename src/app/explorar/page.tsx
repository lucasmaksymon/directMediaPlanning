import { ExplorarExplorer } from "./ExplorarExplorer";
import { fetchExploreData, flattenSearchParams } from "@/lib/explore-query";

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const flat = flattenSearchParams(sp);
  const { units, filters, providerNames } = await fetchExploreData(flat);

  return (
    <main className="flex h-full min-w-0 flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <ExplorarExplorer filters={filters} providerNames={providerNames} units={units} />
    </main>
  );
}
