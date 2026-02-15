import React from 'react';
import { useEmployeeSession } from '@/contexts/EmployeeSessionContext';
import { Button } from '@/components/ui/button';
import { User, RefreshCw, Clock } from 'lucide-react';

interface ActiveEmployeeBarProps {
  className?: string;
}

export function ActiveEmployeeBar({ className = '' }: ActiveEmployeeBarProps) {
  const { activeEmployee, isSessionActive, sessionStartTime, switchEmployee, setShowPinDialog } = useEmployeeSession();

  // Calculate session duration
  const getSessionDuration = () => {
    if (!sessionStartTime) return '';
    const now = new Date();
    const diff = now.getTime() - sessionStartTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}t ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!isSessionActive) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-700">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">Ingen ansatt pålogget</span>
          </div>
          <Button
            size="sm"
            onClick={() => setShowPinDialog(true)}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Logg inn
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-green-700">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-sm">{activeEmployee?.name}</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Aktiv i {getSessionDuration()}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={switchEmployee}
          className="border-green-300 text-green-700 hover:bg-green-100"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Bytt ansatt
        </Button>
      </div>
    </div>
  );
}
