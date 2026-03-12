import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { 
  Home, Map, FileText, LayoutDashboard, Search, 
  Clock, HelpCircle, Settings, Share2, 
  Satellite, Mountain, Moon, Sun 
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { toast } from "sonner";

const CommandMenu = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const changeBasemap = (type: string) => {
    window.dispatchEvent(new CustomEvent('basemap-change', { detail: { type } }));
    setOpen(false);
    toast.success(`Basemap diubah ke ${type}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Cari tindakan atau halaman…" />
      <CommandList>
        <CommandEmpty>Tidak ada hasil.</CommandEmpty>
        <CommandGroup heading="Navigasi">
          <CommandItem onSelect={() => go("/")}> <Home className="mr-2 h-4 w-4" /> Beranda </CommandItem>
          {user && (
            <>
              <CommandItem onSelect={() => go("/map")}> <Map className="mr-2 h-4 w-4" /> Peta </CommandItem>
              <CommandItem onSelect={() => go("/report")}> <FileText className="mr-2 h-4 w-4" /> Buat Laporan </CommandItem>
              <CommandItem onSelect={() => go("/me/reports")}> <Clock className="mr-2 h-4 w-4" /> Laporan Saya </CommandItem>
              {isAdmin && (
                <CommandItem onSelect={() => go("/admin")}> <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard </CommandItem>
              )}
            </>
          )}
          <CommandItem onSelect={() => go("/help")}> <HelpCircle className="mr-2 h-4 w-4" /> Help Center </CommandItem>
          {isAdmin && (
            <CommandItem onSelect={() => go("/admin?tab=settings")}> <Settings className="mr-2 h-4 w-4" /> Pengaturan </CommandItem>
          )}
        </CommandGroup>
        
        {user && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Peta">
              <CommandItem onSelect={() => changeBasemap('osm')}> <Map className="mr-2 h-4 w-4" /> OSM Street </CommandItem>
              <CommandItem onSelect={() => changeBasemap('satellite')}> <Satellite className="mr-2 h-4 w-4" /> Satellite </CommandItem>
              <CommandItem onSelect={() => changeBasemap('terrain')}> <Mountain className="mr-2 h-4 w-4" /> Terrain </CommandItem>
              <CommandItem onSelect={() => changeBasemap('dark')}> <Moon className="mr-2 h-4 w-4" /> Dark Mode </CommandItem>
              <CommandItem onSelect={() => changeBasemap('light')}> <Sun className="mr-2 h-4 w-4" /> Light Mode </CommandItem>
              <CommandItem onSelect={() => {
                navigator.clipboard.writeText(window.location.origin + '/map');
                toast.success("URL Peta disalin ke clipboard");
                setOpen(false);
              }}> 
                <Share2 className="mr-2 h-4 w-4" /> Salin URL Peta 
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Tips">
          <div className="px-2 py-2 text-xs text-muted-foreground flex items-center gap-2"><Search className="h-3 w-3" />Tekan Ctrl+K atau / untuk membuka</div>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandMenu;
