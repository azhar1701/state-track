import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Search, Loader2 } from "lucide-react";
import L from "leaflet";
import { BasemapSwitcher } from "@/features/map/BasemapSwitcher";
import { ReportStepProps, LocationData } from "../../types";
import { useEffect, useState } from "react";
import { geocodeAddress, type GeocodingResult } from "@/features/map/geocoding";

interface LocationStepProps extends ReportStepProps {
  location: LocationData | null;
  setLocation: (loc: LocationData) => void;
  kecamatanList: Array<{ id: string; name: string }>;
  desaList: Array<{ id: string; name: string; kecamatan_id: string }>;
  selectedKecamatanId: string | null;
  onKecamatanChange: (id: string) => void;
  selectedDesaId: string | null;
  onDesaChange: (id: string) => void;
  onGetUserLocation: () => void;
  onMapClick: (lat: number, lng: number) => void;
}

const markerIcon = L.icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAzMiA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMTYgNDhDMTYgNDggMzIgMjguNCAzMiAxNkMzMiA3LjE2MzQ0IDI0LjgzNjYgMCAxNiAwQzcuMTYzNDQgMCAwIDcuMTYzNDQgMCAxNkMwIDI4LjQgMTYgNDggMTYgNDhaIiBmaWxsPSIjMzk4MmY2Ii8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+",
  iconSize: [32, 48],
  iconAnchor: [16, 48],
});

const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => { map.flyTo(center, map.getZoom()); }, [center, map]);
  return null;
};

const MapEvents = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
};

export const LocationStep = ({
  formData,
  location,
  setLocation,
  kecamatanList,
  desaList,
  selectedKecamatanId,
  onKecamatanChange,
  selectedDesaId,
  onDesaChange,
  onGetUserLocation,
  onMapClick,
  onNext,
  onBack,
}: LocationStepProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const results = await geocodeAddress(searchQuery);
      setSearchResults(results);
    } finally {
      setSearchLoading(false);
    }
  };

  const isValid = location && selectedKecamatanId && selectedDesaId;

  return (
    <div className="space-y-6 fade-in">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Kecamatan *</Label>
          <Select value={selectedKecamatanId || ""} onValueChange={onKecamatanChange}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Pilih kecamatan" /></SelectTrigger>
            <SelectContent>
              {kecamatanList.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Desa/Kelurahan *</Label>
          <Select value={selectedDesaId || ""} onValueChange={onDesaChange} disabled={!selectedKecamatanId}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Pilih desa" /></SelectTrigger>
            <SelectContent>
              {desaList.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Lokasi di Peta *</Label>
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Input
              placeholder="Cari alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchResults.length > 0 && (
              <div className="absolute z-[1001] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={`${r.lat}-${r.lon}-${i}`}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent"
                    onClick={() => {
                      onMapClick(Number(r.lat), Number(r.lon));
                      setSearchResults([]);
                      setSearchQuery(r.display_name);
                    }}
                  >
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="icon" variant="outline" onClick={handleSearch} disabled={searchLoading}>
            {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        <div className="relative h-72 rounded-xl overflow-hidden border">
          <MapContainer
            center={location ? [location.latitude, location.longitude] : [-7.325, 108.353]}
            zoom={15}
            className="h-full w-full"
          >
            <BasemapSwitcher />
            {location && (
              <>
                <MapController center={[location.latitude, location.longitude]} />
                <Marker position={[location.latitude, location.longitude]} icon={markerIcon} draggable />
              </>
            )}
            <MapEvents onClick={onMapClick} />
          </MapContainer>
          <Button
            type="button"
            size="sm"
            className="absolute bottom-4 left-4 z-[1000] shadow-md"
            onClick={onGetUserLocation}
          >
            <Navigation className="w-3.5 h-3.5 mr-2" />
            Lokasi Saya
          </Button>
        </div>
        {location?.name && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-xs italic">
            <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary" />
            <span>{location.name}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">Kembali</Button>
        <Button onClick={onNext} disabled={!isValid} className="flex-1">Lanjut</Button>
      </div>
    </div>
  );
};
