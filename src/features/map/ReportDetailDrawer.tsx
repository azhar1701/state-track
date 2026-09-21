import { ReportDetailView } from './ReportDetailView';
import type { Report } from '@/services/types';

export type { Report };

interface ReportDetailDrawerProps {
  report: Report;
  onClose: () => void;
  onRoute?: () => void;
}

export const ReportDetailDrawer = ({ report, onClose, onRoute }: ReportDetailDrawerProps) => {
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
    window.open(url, '_blank');
  };

  return <ReportDetailView report={report} onClose={onClose} onNavigate={openInGoogleMaps} onRoute={onRoute} />;
};
