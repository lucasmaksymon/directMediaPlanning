"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { ExploreMapMarker } from "@/lib/explore-query";

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

export function ExploreMapInner({ markers }: { markers: ExploreMapMarker[] }) {
  const points: [number, number][] = markers.map((u) => [u.lat, u.lng]);
  const defaultCenter: [number, number] = [-34.6037, -58.3816];
  const center = points[0] ?? defaultCenter;

  if (markers.length === 0) {
    return (
      <div className="flex h-[min(75dvh,900px)] min-h-[22rem] w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border bg-muted/50 px-6 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Sin puntos en el mapa</p>
        <p>Ningún resultado incluye coordenadas con estos filtros.</p>
      </div>
    );
  }

  return (
    <div className="relative z-0 h-[min(75dvh,900px)] w-full min-h-[22rem] overflow-hidden rounded-[var(--radius-lg)] border border-border shadow-sm">
      <MapContainer
        center={center}
        className="h-full w-full"
        scrollWheelZoom
        style={{ minHeight: 352 }}
        zoom={12}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((u) => (
          <Marker icon={markerIcon} key={u.id} position={[u.lat, u.lng]}>
            <Popup>
              <div className="min-w-[180px] py-1">
                <p className="font-semibold leading-snug text-carbon">{u.name}</p>
                <Link
                  className="mt-2 inline-flex text-sm font-semibold text-[#00b6c7] underline underline-offset-2"
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
