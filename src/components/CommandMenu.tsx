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
import { Home, Map, FileText, LayoutDashboard, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const CommandMenu = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const prefetchMap = () => import("@/pages/MapView");
  const prefetchReport = () => import("@/pages/ReportForm");
  const prefetchAdmin = () => import("@/pages/AdminDashboard");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Cari tindakan atau halaman…" />
      <CommandList>
        <CommandEmpty>Tidak ada hasil.</CommandEmpty>
        <CommandGroup heading="Navigasi">
          <CommandItem onSelect={() => go("/")}> <Home className="mr-2 h-4 w-4" /> Beranda </CommandItem>
          {user && (
            <>
              <CommandItem onMouseEnter={prefetchMap} onFocus={prefetchMap} onSelect={() => go("/map")}> <Map className="mr-2 h-4 w-4" /> Peta </CommandItem>
              <CommandItem onMouseEnter={prefetchReport} onFocus={prefetchReport} onSelect={() => go("/report")}> <FileText className="mr-2 h-4 w-4" /> Buat Laporan </CommandItem>
              {isAdmin && (
                <CommandItem onMouseEnter={prefetchAdmin} onFocus={prefetchAdmin} onSelect={() => go("/admin")}> <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard </CommandItem>
              )}
            </>
          )}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tips">
          <div className="px-2 py-2 text-xs text-muted-foreground flex items-center gap-2"><Search className="h-3 w-3" />Tekan Ctrl+K atau / untuk membuka</div>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandMenu;
