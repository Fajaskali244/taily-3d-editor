import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, AlertTriangle } from 'lucide-react';

interface SecurityEvent {
  timestamp: string;
  event: string;
  user_id?: string;
  details: any;
}

interface SecurityLoggerProps {
  className?: string;
}

export const SecurityLogger: React.FC<SecurityLoggerProps> = ({ className }) => {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  useEffect(() => {
    // Monitor failed authentication attempts
    const monitorAuthFailures = () => {
      const originalError = console.error;
      console.error = (...args) => {
        originalError(...args);
        
        // Look for authentication errors
        const errorMessage = args.join(' ').toLowerCase();
        if (errorMessage.includes('auth') && 
            (errorMessage.includes('failed') || 
             errorMessage.includes('invalid') || 
             errorMessage.includes('unauthorized'))) {
          
          setFailedAttempts(prev => prev + 1);
          
          const securityEvent: SecurityEvent = {
            timestamp: new Date().toISOString(),
            event: 'auth_failure_detected',
            user_id: user?.id,
            details: {
              error_message: args[0],
              source: 'client_side_monitor'
            }
          };
          
          setSecurityEvents(prev => [securityEvent, ...prev.slice(0, 19)]);
        }
      };

      return () => {
        console.error = originalError;
      };
    };

    const cleanup = monitorAuthFailures();

    // Log successful authentication
    if (user) {
      const authEvent: SecurityEvent = {
        timestamp: new Date().toISOString(),
        event: 'user_authenticated',
        user_id: user.id,
        details: {
          user_email: user.email,
          session_start: new Date().toISOString()
        }
      };
      
      setSecurityEvents(prev => [authEvent, ...prev.slice(0, 19)]);
      setFailedAttempts(0); // Reset failed attempts on successful auth
    }

    return cleanup;
  }, [user]);

  // Monitor for suspicious patterns
  useEffect(() => {
    if (failedAttempts >= 3) {
      const suspiciousEvent: SecurityEvent = {
        timestamp: new Date().toISOString(),
        event: 'suspicious_activity_detected',
        user_id: user?.id,
        details: {
          failed_attempts: failedAttempts,
          description: 'Multiple authentication failures detected',
          severity: 'high'
        }
      };
      
      setSecurityEvents(prev => [suspiciousEvent, ...prev.slice(0, 19)]);
    }
  }, [failedAttempts, user?.id]);

  if (!user) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {failedAttempts >= 3 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            <strong>Security Alert:</strong> Multiple authentication failures detected. 
            Your account may be under attack.
          </AlertDescription>
        </Alert>
      )}
      
      <Alert className="border-blue-500 bg-blue-50">
        <Eye className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          <strong>Security Monitor Active:</strong> Tracking {securityEvents.length} events
          {failedAttempts > 0 && ` | ${failedAttempts} recent failures`}
        </AlertDescription>
      </Alert>

      {process.env.NODE_ENV === 'development' && securityEvents.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            View Recent Security Events
          </summary>
          <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
            {securityEvents.slice(0, 5).map((event, index) => (
              <div key={index} className="text-xs p-2 bg-muted rounded">
                <div className="font-mono">
                  {new Date(event.timestamp).toLocaleTimeString()} - {event.event}
                </div>
                {event.details && (
                  <div className="text-muted-foreground mt-1">
                    {JSON.stringify(event.details, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};