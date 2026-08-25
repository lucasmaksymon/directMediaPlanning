"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];
const DEFAULT_ZOOM = 12;

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
};

function MapClickLayer({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToPin({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
      />
    </svg>
  );
}

export function LocationMapPickerInner({ latitude, longitude, onChange }: Props) {
  const hasPin =
    latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);
  const center: [number, number] = hasPin ? [latitude!, longitude!] : DEFAULT_CENTER;

  const handleDragEnd = (e: L.LeafletEvent) => {
    const marker = e.target as L.Marker;
    const p = marker.getLatLng();
    onChange(p.lat, p.lng);
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-led/25 bg-card shadow-sm ring-1 ring-led/10 ">
      <div className="flex items-center gap-2.5 border-b border-border bg-muted/60 px-4 py-3 backdrop-blur-sm">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-border">
          <MapPinIcon className="h-4 w-4 text-led" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Punto en el mapa</p>
          <p className="text-xs leading-snug text-muted-foreground">
            Clic para colocar · arrastrá el pin para afinar
          </p>
        </div>
      </div>
      <div className="h-[min(360px,50vh)] w-full min-h-[260px] bg-muted/40">
        <MapContainer
          center={center}
          className="h-full w-full [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:bg-white/90 dark:[&_.leaflet-control-attribution]:bg-carbon/90 dark:[&_.leaflet-control-attribution]:text-muted-foreground"
          scrollWheelZoom
          style={{ minHeight: 260 }}
          zoom={hasPin ? 14 : DEFAULT_ZOOM}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickLayer
            onPick={(lat, lng) => {
              onChange(lat, lng);
            }}
          />
          {hasPin && (
            <Marker
              draggable
              eventHandlers={{
                dragend: handleDragEnd,
              }}
              icon={markerIcon}
              position={[latitude!, longitude!]}
            />
          )}
          <FlyToPin lat={latitude} lng={longitude} />
        </MapContainer>
      </div>
      <p className="border-t border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Sin pin, el espacio sigue apareciendo en la lista del catálogo, pero no en el mapa público.
      </p>
    </div>
  );
}
