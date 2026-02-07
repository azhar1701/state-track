import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';

export const useReportDetailURL = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const reportId = searchParams.get('reportId');

  const openReport = useCallback((id: string) => {
    setSearchParams({ reportId: id });
  }, [setSearchParams]);

  const closeReport = useCallback(() => {
    searchParams.delete('reportId');
    setSearchParams(searchParams);
  }, [searchParams, setSearchParams]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (!searchParams.has('reportId')) {
        // Report was closed via back button
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [searchParams]);

  return {
    reportId,
    openReport,
    closeReport,
  };
};
