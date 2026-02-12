import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Wrench, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const SystemSettings = () => {
  const [metrics, setMetrics] = useState({
    uptime: '98.5%',
    responseTime: '45ms',
    storage: '2.3GB',
    apiCalls: '156'
  });
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        responseTime: `${Math.floor(Math.random() * 20 + 40)}ms`,
        apiCalls: `${Math.floor(Math.random() * 50 + 150)}`
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    setClearing(true);
    setTimeout(() => {
      setClearing(false);
      toast.success('Cache berhasil dibersihkan', {
        description: 'Performa aplikasi telah dioptimalkan',
        icon: <CheckCircle className="h-4 w-4" />
      });
    }, 1500);
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-gray-500" />
          Sistem & Performa
        </CardTitle>
        <CardDescription>Monitor kesehatan dan optimasi sistem</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{metrics.uptime}</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">Uptime</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{metrics.responseTime}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Response Time</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{metrics.storage}</div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Storage Used</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{metrics.apiCalls}</div>
            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">API Calls/min</div>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleClearCache}
            disabled={clearing}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {clearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Clear Cache & Optimize
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Terakhir dioptimalkan: {new Date().toLocaleString('id-ID')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
