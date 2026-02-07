import { create } from 'zustand';

type Report = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_url: string | null;
  photo_urls?: string[] | null;
  created_at: string;
  user_id: string;
};

export type MapFilters = {
  category?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type MapOverlays = {
  adminBoundaries: boolean;
  clustering: boolean;
  heatmap: boolean;
  dynamic: Record<string, boolean>;
};

type BasemapType = 'osm' | 'satellite' | 'terrain' | 'dark';

interface MapStore {
  reports: Report[];
  loading: boolean;
  selectedReport: Report | null;
  mapCenter: [number, number];
  mapZoom: number;
  basemap: BasemapType;
  userLocation: [number, number] | null;
  filters: MapFilters;
  overlays: MapOverlays;
  showSearchPanel: boolean;
  showFilterPanel: boolean;
  showOverlayPanel: boolean;
  
  setReports: (reports: Report[]) => void;
  setLoading: (loading: boolean) => void;
  setSelectedReport: (report: Report | null) => void;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  setBasemap: (basemap: BasemapType) => void;
  setUserLocation: (location: [number, number] | null) => void;
  setFilters: (filters: MapFilters) => void;
  setOverlays: (overlays: MapOverlays) => void;
  toggleSearchPanel: () => void;
  toggleFilterPanel: () => void;
  toggleOverlayPanel: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  reports: [],
  loading: true,
  selectedReport: null,
  mapCenter: [-7.325, 108.353],
  mapZoom: 12,
  basemap: 'osm',
  userLocation: null,
  filters: {},
  overlays: {
    adminBoundaries: true,
    clustering: true,
    heatmap: false,
    dynamic: {},
  },
  showSearchPanel: false,
  showFilterPanel: false,
  showOverlayPanel: false,
  
  setReports: (reports) => set({ reports }),
  setLoading: (loading) => set({ loading }),
  setSelectedReport: (selectedReport) => set({ selectedReport }),
  setMapCenter: (mapCenter) => set({ mapCenter }),
  setMapZoom: (mapZoom) => set({ mapZoom }),
  setBasemap: (basemap) => set({ basemap }),
  setUserLocation: (userLocation) => set({ userLocation }),
  setFilters: (filters) => set({ filters }),
  setOverlays: (overlays) => set({ overlays }),
  toggleSearchPanel: () => set((state) => ({
    showSearchPanel: !state.showSearchPanel,
    showFilterPanel: false,
    showOverlayPanel: false,
  })),
  toggleFilterPanel: () => set((state) => ({
    showFilterPanel: !state.showFilterPanel,
    showSearchPanel: false,
    showOverlayPanel: false,
  })),
  toggleOverlayPanel: () => set((state) => ({
    showOverlayPanel: !state.showOverlayPanel,
    showSearchPanel: false,
    showFilterPanel: false,
  })),
}));
