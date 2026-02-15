import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

interface Employee {
  id: number;
  name: string;
  email: string | null;
  role: string;
}

interface EmployeeSessionContextType {
  // Current active employee
  activeEmployee: Employee | null;
  
  // Session state
  isSessionActive: boolean;
  sessionStartTime: Date | null;
  
  // Actions
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchEmployee: () => void;
  
  // UI state
  showPinDialog: boolean;
  setShowPinDialog: (show: boolean) => void;
  
  // Loading state
  isVerifying: boolean;
}

const EmployeeSessionContext = createContext<EmployeeSessionContextType | null>(null);

const SESSION_STORAGE_KEY = 'stylora_employee_session';

interface StoredSession {
  employeeId: number;
  employeeName: string;
  employeeEmail: string | null;
  employeeRole: string;
  startTime: string;
}

export function EmployeeSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Use the verifyPin mutation
  const verifyPinMutation = trpc.employees.verifyPin.useMutation();

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSession) {
      try {
        const session: StoredSession = JSON.parse(storedSession);
        setActiveEmployee({
          id: session.employeeId,
          name: session.employeeName,
          email: session.employeeEmail,
          role: session.employeeRole,
        });
        setSessionStartTime(new Date(session.startTime));
      } catch (e) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, []);

  // Login with PIN - now uses API
  const loginWithPin = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (pin.length < 4) {
      return { success: false, error: 'PIN må være minst 4 siffer' };
    }

    setIsVerifying(true);
    
    try {
      const result = await verifyPinMutation.mutateAsync({ pin });
      
      if (result.success && result.employee) {
        // Set active employee
        const now = new Date();
        setActiveEmployee({
          id: result.employee.id,
          name: result.employee.name,
          email: result.employee.email,
          role: result.employee.role,
        });
        setSessionStartTime(now);
        setShowPinDialog(false);

        // Store session in localStorage
        const session: StoredSession = {
          employeeId: result.employee.id,
          employeeName: result.employee.name,
          employeeEmail: result.employee.email,
          employeeRole: result.employee.role,
          startTime: now.toISOString(),
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

        return { success: true };
      }
      
      return { success: false, error: 'Ugyldig PIN-kode' };
    } catch (error: any) {
      console.error('PIN verification error:', error);
      return { 
        success: false, 
        error: error.message || 'Ugyldig PIN-kode' 
      };
    } finally {
      setIsVerifying(false);
    }
  }, [verifyPinMutation]);

  // Logout
  const logout = useCallback(() => {
    setActiveEmployee(null);
    setSessionStartTime(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  // Switch employee (show PIN dialog)
  const switchEmployee = useCallback(() => {
    setShowPinDialog(true);
  }, []);

  const value: EmployeeSessionContextType = {
    activeEmployee,
    isSessionActive: activeEmployee !== null,
    sessionStartTime,
    loginWithPin,
    logout,
    switchEmployee,
    showPinDialog,
    setShowPinDialog,
    isVerifying,
  };

  return (
    <EmployeeSessionContext.Provider value={value}>
      {children}
    </EmployeeSessionContext.Provider>
  );
}

export function useEmployeeSession() {
  const context = useContext(EmployeeSessionContext);
  if (!context) {
    throw new Error('useEmployeeSession must be used within EmployeeSessionProvider');
  }
  return context;
}
