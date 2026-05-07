"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { ExploreUnitDTO } from "@/lib/explore-query";
import { formatArs } from "@/lib/format";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitView({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0]!, 13);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [map, points]);
  return null;
}

export function ExploreMapInner({ units }: { units: ExploreUnitDTO[] }) {
  const mappable = units.filter(
    (u) =>
      u.lat != null &&
      u.lng != null &&
      Number.isFinite(u.lat) &&
      Number.isFinite(u.lng),
  );
  const points: [number, number][] = mappable.map((u) => [u.lat!, u.lng!]);
  const defaultCenter: [number, number] = [-34.6037, -58.3816];
  const center = points[0] ?? defaultCenter;

  if (mappable.length === 0) {
    return (
      <div className="flex h-[min(60vh,520px)] min-h-[360px] w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-muted/50 px-6 text-center text-sm text-muted-foreground backdrop-blur-sm">
        <p className="font-medium text-foreground">Sin puntos en el mapa</p>
        <p>
          Ningún resultado incluye coordenadas. Probá ampliar filtros o revisá la lista: algunos
          espacios solo tienen texto de ubicación.
        </p>
      </div>
    );
  }

  return (
    <div className="relative z-0 h-[min(60vh,520px)] w-full min-h-[360px] overflow-hidden rounded-3xl border border-led/25 shadow-sm nm-glow ring-1 ring-led/10">
      <MapContainer
        center={center}
        className="h-full w-full"
        scrollWheelZoom
        style={{ minHeight: 360 }}
        zoom={12}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mappable.map((u) => (
          <Marker icon={markerIcon} key={u.id} position={[u.lat!, u.lng!]}>
            <Popup>
              <div className="min-w-[210px] py-1">
                <p className="font-semibold leading-snug text-carbon">{u.name}</p>
                <p className="mt-1 text-xs leading-snug text-[#5a6567]">{u.locationLabel}</p>
                <p className="mt-2 text-sm font-semibold text-carbon">{formatArs(Number(u.basePriceAmount))}</p>
                <p className="text-xs text-[#5a6567]">{u.providerName}</p>
                <Link
                  className="mt-3 inline-flex text-sm font-semibold text-[#00b6c7] underline underline-offset-2"
                  href={`/explorar/${u.id}`}
                >
                  Ver ficha
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitView points={points} />
      </MapContainer>
    </div>
  );
}
