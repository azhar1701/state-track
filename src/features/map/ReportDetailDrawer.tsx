import { ReportDetailView } from './ReportDetailView';
import type { Report } from '@/services/types';

export type { Report };

interface ReportDetailDrawerProps {
  report: Report;
  onClose: () => void;
  onRoute?: () => void;
  mode?: 'drawer' | 'modal';
  showMiniMap?: boolean;
}

export const ReportDetailDrawer = ({
  report,
  onClose,
  onRoute,
  mode = 'drawer',
  showMiniMap,
}: ReportDetailDrawerProps) => {
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleRoute = onRoute || (() => {
    const url = `/map?selectedReportId=${encodeURIComponent(report.id)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  return (
    <ReportDetailView
      report={report}
      onClose={onClose}
      onNavigate={openInGoogleMaps}
      onRoute={handleRoute}
      mode={mode}
      showMiniMap={showMiniMap}
    />
  );
};
