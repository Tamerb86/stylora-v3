import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEmployeeSession } from '@/contexts/EmployeeSessionContext';
import { User, Lock, Delete, LogOut, Check, Loader2 } from 'lucide-react';

export function PinLoginDialog() {
  const { showPinDialog, setShowPinDialog, loginWithPin, activeEmployee, logout, isVerifying } = useEmployeeSession();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Reset PIN when dialog opens
  useEffect(() => {
    if (showPinDialog) {
      setPin('');
      setError('');
    }
  }, [showPinDialog]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN må være minst 4 siffer');
      return;
    }

    const result = await loginWithPin(pin);

    if (!result.success) {
      setError(result.error || 'Ugyldig PIN');
      setPin('');
    }
  };

  const handleLogout = () => {
    logout();
    setShowPinDialog(false);
  };

  return (
    <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Lock className="h-5 w-5" />
            {activeEmployee ? 'Bytt ansatt' : 'Logg inn med PIN'}
          </DialogTitle>
        </DialogHeader>

        {activeEmployee && (
          <div className="bg-blue-50 p-3 rounded-lg mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="text-sm">
                Aktiv: <strong>{activeEmployee.name}</strong>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logg ut
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {/* PIN Display - 6 boxes for 4-6 digit PIN */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className={`w-11 h-14 border-2 rounded-lg flex items-center justify-center text-2xl font-bold transition-all
                  ${pin.length > index ? 'border-primary bg-primary/10' : 'border-gray-300'}
                  ${error ? 'border-red-500 bg-red-50' : ''}
                  ${index >= 4 ? 'opacity-60' : ''}
                `}
              >
                {pin.length > index ? '●' : ''}
              </div>
            ))}
          </div>

          {/* PIN length indicator */}
          <p className="text-center text-xs text-muted-foreground">
            {pin.length}/6 siffer (minimum 4)
          </p>

          {/* Error Message */}
          {error && (
            <p className="text-center text-red-500 text-sm font-medium">{error}</p>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <Button
                key={digit}
                variant="outline"
                className="h-14 text-xl font-semibold hover:bg-primary hover:text-white"
                onClick={() => handlePinInput(String(digit))}
                disabled={isVerifying || pin.length >= 6}
              >
                {digit}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-14 text-sm hover:bg-red-100 text-red-600"
              onClick={handleClear}
              disabled={isVerifying}
            >
              Tøm
            </Button>
            <Button
              variant="outline"
              className="h-14 text-xl font-semibold hover:bg-primary hover:text-white"
              onClick={() => handlePinInput('0')}
              disabled={isVerifying || pin.length >= 6}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-14 hover:bg-yellow-100"
              onClick={handleDelete}
              disabled={isVerifying || pin.length === 0}
            >
              <Delete className="h-5 w-5" />
            </Button>
          </div>

          {/* Submit Button */}
          <Button
            className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            onClick={handleSubmit}
            disabled={isVerifying || pin.length < 4}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Verifiserer...
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Logg inn
              </>
            )}
          </Button>

          {/* Help Text */}
          <p className="text-center text-xs text-gray-500">
            Bruk PIN-koden som er satt i ansattprofilen din (4-6 siffer)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
