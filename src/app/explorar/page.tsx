import { ExplorarExplorer } from "./ExplorarExplorer";
import { fetchExploreData, flattenSearchParams } from "@/lib/explore-query";

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const flat = flattenSearchParams(sp);
  const { units, markers, total, hasMore, filters, providerNames } =
    await fetchExploreData(flat);

  return (
    <main className="flex h-full min-w-0 flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <ExplorarExplorer
        filters={filters}
        hasMore={hasMore}
        initialUnits={units}
        markers={markers}
        providerNames={providerNames}
        total={total}
      />
    </main>
  );
}
