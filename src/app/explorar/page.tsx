import { ExplorarExplorer } from "./ExplorarExplorer";
import { fetchExploreData, flattenSearchParams } from "@/lib/explore-query";

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const flat = flattenSearchParams(sp);
  const { units, providers, filters } = await fetchExploreData(flat);

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-10 max-w-4xl">
        <h1 className="font-display text-3xl font-normal uppercase tracking-wide text-foreground sm:text-4xl">
          Catálogo de espacios
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Filtrá por zona, medio o fechas. Compará precios de referencia y abrí la ficha de cada
          espacio. El mapa muestra ubicaciones con coordenadas cargadas por el proveedor.
        </p>
      </header>

      <ExplorarExplorer filters={filters} providers={providers} units={units} />
    </main>
  );
}
