"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useRef } from "react";
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

function pointsKey(points: [number, number][]) {
  return points.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join(";");
}

/** Encuadra una sola vez por conjunto de puntos. Si el efecto depende del array, cada render del padre vuelve a alejar el mapa. */
function FitView({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = pointsKey(points);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    const current = pointsRef.current;
    if (current.length === 0) return;
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();
      if (current.length === 1) {
        map.setView(current[0]!, 13, { animate: false });
        return;
      }
      map.fitBounds(L.latLngBounds(current), { padding: [48, 48], maxZoom: 14, animate: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [map, key]);
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
