import { useState } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface MapOverlays {
    adminBoundaries: boolean;
    reports?: boolean;
    infrastructure?: boolean;
    assets?: boolean;
    clustering?: boolean;
    heatmap?: boolean;
    dynamic?: Record<string, boolean>;
}

interface OverlayToggleProps {
    overlays: MapOverlays;
    onOverlayChange: (overlays: MapOverlays) => void;
    onClose?: () => void;
    availableLayers?: Array<{ key: string; name: string }>;
}

export const OverlayToggle = ({ overlays, onOverlayChange, onClose, availableLayers }: OverlayToggleProps) => {
    const isMobile = useIsMobile();
    const [localOverlays, setLocalOverlays] = useState<MapOverlays>(overlays);

    const handleToggle = (key: keyof MapOverlays, value: boolean) => {
        const newOverlays = {
            ...localOverlays,
            [key]: value,
        };
        setLocalOverlays(newOverlays);
        onOverlayChange(newOverlays);
    };

    const dyn = localOverlays.dynamic || {};

    return (
        <>
            {/* Interactive Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/30 backdrop-blur-xs z-[1190] pointer-events-auto"
                aria-hidden="true"
            />

            <motion.div
                initial={isMobile ? { y: '100%' } : { x: '100%' }}
                animate={isMobile ? { y: 0 } : { x: 0 }}
                exit={isMobile ? { y: '100%' } : { x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className={cn(
                    "fixed z-[1200] bg-popover/95 backdrop-blur-xl border-border shadow-lifted pointer-events-auto flex flex-col",
                    "max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:rounded-t-3xl max-lg:max-h-[85vh] max-lg:border-t max-lg:pb-safe",
                    "lg:top-0 lg:right-0 lg:h-full lg:w-80 lg:border-l lg:rounded-none overflow-y-auto"
                )}
            >
                {/* Mobile Drag Handle */}
                <div className="lg:hidden flex justify-center py-2.5 cursor-grab touch-none" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
                </div>

                <div className="sticky top-0 bg-card border-b border-border px-4 py-3.5 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        <h2 className="text-base font-semibold">Layer & Overlay</h2>
                    </div>
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-8 w-8">
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between py-2">
                        <Label htmlFor="admin-boundaries" className="text-sm font-medium">
                            Batas Administratif
                        </Label>
                        <Switch
                            id="admin-boundaries"
                            checked={localOverlays.adminBoundaries}
                            onCheckedChange={(checked) => handleToggle('adminBoundaries', checked)}
                        />
                    </div>

                    {availableLayers && availableLayers.length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-border/60">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layer Geospasial</div>
                            {availableLayers.map((l) => (
                                <div key={l.key} className="flex items-center justify-between py-2">
                                    <Label htmlFor={`dyn-${l.key}`} className="text-sm font-medium">
                                        {l.name}
                                    </Label>
                                    <Switch
                                        id={`dyn-${l.key}`}
                                        checked={Boolean(dyn[l.key])}
                                        onCheckedChange={(checked) => {
                                            const newDyn = { ...(localOverlays.dynamic || {}) };
                                            newDyn[l.key] = checked;
                                            const newOverlays = { ...localOverlays, dynamic: newDyn };
                                            setLocalOverlays(newOverlays);
                                            onOverlayChange(newOverlays);
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3 pt-2 border-t border-border/60">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visualisasi</div>
                        <div className="flex items-center justify-between py-2">
                            <Label htmlFor="clustering" className="text-sm font-medium">
                                Cluster Marker
                            </Label>
                            <Switch
                                id="clustering"
                                checked={Boolean(localOverlays.clustering)}
                                onCheckedChange={(checked) => handleToggle('clustering', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <Label htmlFor="heatmap" className="text-sm font-medium">
                                Heatmap Kepadatan
                            </Label>
                            <Switch
                                id="heatmap"
                                checked={Boolean(localOverlays.heatmap)}
                                onCheckedChange={(checked) => handleToggle('heatmap', checked)}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
};
