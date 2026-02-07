import { ReportDetailView } from './ReportDetailView';

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  resolution?: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_url: string | null;
  photo_urls?: string[] | null;
  created_at: string;
  user_id: string;
}

interface ReportDetailDrawerProps {
  report: Report;
  onClose: () => void;
}

export const ReportDetailDrawer = ({ report, onClose }: ReportDetailDrawerProps) => {
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
    window.open(url, '_blank');
  };

  return <ReportDetailView report={report} onClose={onClose} onNavigate={openInGoogleMaps} />;
};
