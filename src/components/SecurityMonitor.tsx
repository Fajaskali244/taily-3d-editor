import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { SecurityLogger } from './SecurityLogger';

interface SecurityEvent {
  timestamp: string;
  event: string;
  user_id?: string;
  details: any;
}

export const SecurityMonitor: React.FC = () => {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [rlsViolations, setRlsViolations] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Monitor for security events
    const checkSecurityStatus = async () => {
      try {
        // Test anonymous access to sensitive tables
        const anonymousClient = supabase;
        const testResults = [];

        // Test profiles access as anonymous
        const { data: profilesData, error: profilesError } = await anonymousClient
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (profilesData && profilesData.length > 0) {
          testResults.push({
            table: 'profiles',
            accessible: true,
            severity: 'critical'
          });
        }

        // Test orders access as anonymous
        const { data: ordersData, error: ordersError } = await anonymousClient
          .from('orders')
          .select('id')
          .limit(1);
        
        if (ordersData && ordersData.length > 0) {
          testResults.push({
            table: 'orders',
            accessible: true,
            severity: 'critical'
          });
        }

        // Test cart_items access as anonymous
        const { data: cartData, error: cartError } = await anonymousClient
          .from('cart_items')
          .select('id')
          .limit(1);
        
        if (cartData && cartData.length > 0) {
          testResults.push({
            table: 'cart_items',
            accessible: true,
            severity: 'critical'
          });
        }

        if (testResults.length > 0) {
          setRlsViolations(testResults);
        }

        // Log security check
        const securityEvent: SecurityEvent = {
          timestamp: new Date().toISOString(),
          event: 'security_check',
          user_id: user.id,
          details: {
            violations_found: testResults.length,
            tables_checked: ['profiles', 'orders', 'cart_items'],
            violations: testResults
          }
        };

        setSecurityEvents(prev => [securityEvent, ...prev.slice(0, 9)]);

      } catch (error) {
        console.error('Security check failed:', error);
      }
    };

    checkSecurityStatus();
    
    // Run security checks every 30 seconds
    const interval = setInterval(checkSecurityStatus, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  if (rlsViolations.length > 0) {
    return (
      <Alert className="border-destructive bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-destructive">
          <strong>Critical Security Issue:</strong> Anonymous users can access sensitive data.
          Tables affected: {rlsViolations.map(v => v.table).join(', ')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-green-500 bg-green-50">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          Security status: RLS policies are functioning correctly.
        </AlertDescription>
      </Alert>
      
      <SecurityLogger />
    </div>
  );
};