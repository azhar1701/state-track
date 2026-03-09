import { X, ZoomIn, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect } from 'react';
import type { Geometry } from 'geojson';

interface LayerDetailDrawerProps {
 isOpen: boolean;
 onClose: () => void;
 feature: {
 properties: Record<string, unknown>;
 geometry?: Geometry;
 } | null;
 onZoomToFeature?: () => void;
 allowList?: string[];
 blockList?: string[];
}

const defaultBlockList = [
 'objectid',
 'shape_length',
 'shape_area',
 'shape_leng',
 'shape__area',
 'shape__length',
 'fid',
 'gid',
];

export function LayerDetailDrawer({
 isOpen,
 onClose,
 feature,
 onZoomToFeature,
 allowList,
 blockList = defaultBlockList,
}: LayerDetailDrawerProps) {
 const isMobile = useIsMobile();

 useEffect(() => {
 if (isOpen) {
 document.body.style.overflow = 'hidden';
 } else {
 document.body.style.overflow = '';
 }
 return () => {
 document.body.style.overflow = '';
 };
 }, [isOpen]);

 if (!isOpen || !feature) return null;

 const properties = feature.properties || {};
 // Get title from common property names
 const title = (properties.NAMOBJ as string) ||
 (properties.REMARK as string) ||
 (properties.name as string) ||
 (properties.NAME as string) ||
 (properties.title as string) ||
 'Detail Layer';

 // Filter properties
 const filteredEntries = Object.entries(properties).filter(([key]) => {
 const lowerKey = key.toLowerCase();
 if (allowList && allowList.length > 0) {
 return allowList.includes(key);
 }
 return !blockList.some(blocked => lowerKey.includes(blocked.toLowerCase()));
 });

 const geometryType = feature.geometry?.type || 'Unknown';

 return (
 <>
 {/* Desktop: Side Panel */}
 {!isMobile && (
 <div
 className={`fixed top-0 right-0 h-full w-[400px] z-[1400] bg-popover/95 border-border shadow-lg border-l border-border transition-transform duration-300 ${
 isOpen ? 'translate-x-0' : 'translate-x-full'
 }`}
 >
 <div className="h-full flex flex-col">
 {/* Header */}
 <div className="flex items-center justify-between p-4 border-b border-border">
 <div className="flex items-center gap-2 flex-1 min-w-0">
 <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
 <h2 className="text-lg font-bold truncate">{title}</h2>
 </div>
 <div className="flex items-center gap-2">
 {onZoomToFeature && (
 <Button
 size="sm"
 variant="ghost"
 onClick={onZoomToFeature}
 className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm transition-colors rounded-xl px-6 py-2.5 font-medium !p-2"
 >
 <ZoomIn className="w-4 h-4" />
 </Button>
 )}
 <Button
 size="sm"
 variant="ghost"
 onClick={onClose}
 className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm transition-colors rounded-xl px-6 py-2.5 font-medium !p-2"
 >
 <X className="w-4 h-4" />
 </Button>
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-4">
 {/* Geometry Type Badge */}
 <div className="mb-4">
 <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary">
 {geometryType}
 </span>
 </div>

 {/* Properties Table */}
 <div className="space-y-3">
 {filteredEntries.length === 0 ? (
 <p className="text-sm text-muted-foreground">Tidak ada data untuk ditampilkan</p>
 ) : (
 filteredEntries.map(([key, value]) => (
 <div key={key} className="grid grid-cols-3 gap-2 py-2 border-b border-border">
 <div className="col-span-1">
 <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
 {key.replace(/_/g, ' ')}
 </p>
 </div>
 <div className="col-span-2">
 <p className="text-sm font-semibold text-foreground break-words">
 {value !== null && value !== undefined ? String(value) : '-'}
 </p>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Mobile: Bottom Sheet */}
 {isMobile && (
 <div
 className={`fixed bottom-0 left-0 right-0 z-[1400] bg-popover/95 border-border shadow-lg border-t border-border rounded-t-3xl transition-transform duration-300 ${
 isOpen ? 'translate-y-0' : 'translate-y-full'
 }`}
 style={{ maxHeight: '50vh' }}
 >
 <div className="h-full flex flex-col">
 {/* Drag Handle */}
 <div className="flex justify-center pt-3 pb-2">
 <div className="w-12 h-1 rounded-full bg-white/30" />
 </div>

 {/* Header */}
 <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
 <div className="flex items-center gap-2 flex-1 min-w-0">
 <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
 <h2 className="text-base font-bold truncate">{title}</h2>
 </div>
 <div className="flex items-center gap-2">
 {onZoomToFeature && (
 <Button
 size="sm"
 variant="ghost"
 onClick={onZoomToFeature}
 className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm transition-colors rounded-xl px-6 py-2.5 font-medium !p-2"
 >
 <ZoomIn className="w-4 h-4" />
 </Button>
 )}
 <Button
 size="sm"
 variant="ghost"
 onClick={onClose}
 className="bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm transition-colors rounded-xl px-6 py-2.5 font-medium !p-2"
 >
 <X className="w-4 h-4" />
 </Button>
 </div>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-4">
 {/* Geometry Type Badge */}
 <div className="mb-3">
 <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary">
 {geometryType}
 </span>
 </div>

 {/* Properties Table */}
 <div className="space-y-2">
 {filteredEntries.length === 0 ? (
 <p className="text-sm text-muted-foreground">Tidak ada data untuk ditampilkan</p>
 ) : (
 filteredEntries.map(([key, value]) => (
 <div key={key} className="py-2 border-b border-border">
 <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
 {key.replace(/_/g, ' ')}
 </p>
 <p className="text-sm font-semibold text-foreground break-words">
 {value !== null && value !== undefined ? String(value) : '-'}
 </p>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </>
 );
}
