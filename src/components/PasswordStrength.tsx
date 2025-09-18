import React from 'react';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Check } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  onStrengthChange?: (isStrong: boolean) => void;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ 
  password, 
  onStrengthChange 
}) => {
  const requirements = [
    { test: /.{8,}/, label: 'At least 8 characters' },
    { test: /[A-Z]/, label: 'One uppercase letter' },
    { test: /[a-z]/, label: 'One lowercase letter' },
    { test: /\d/, label: 'One number' },
    { test: /[!@#$%^&*(),.?":{}|<>]/, label: 'One special character' }
  ];

  const score = requirements.reduce((acc, req) => {
    return acc + (req.test.test(password) ? 1 : 0);
  }, 0);

  const percentage = (score / requirements.length) * 100;
  const isStrong = score >= 4;

  React.useEffect(() => {
    onStrengthChange?.(isStrong && password.length > 0);
  }, [isStrong, password.length, onStrengthChange]);

  if (!password) return null;

  const getStrengthText = () => {
    if (score <= 1) return 'Very Weak';
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score <= 4) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = () => {
    if (score <= 1) return 'bg-red-500';
    if (score <= 2) return 'bg-orange-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Password strength</span>
        <span className={`text-sm font-medium ${isStrong ? 'text-green-600' : 'text-orange-600'}`}>
          {getStrengthText()}
        </span>
      </div>
      
      <Progress value={percentage} className="h-2" />
      
      <div className="space-y-1">
        {requirements.map((req, index) => {
          const met = req.test.test(password);
          return (
            <div key={index} className="flex items-center text-xs">
              {met ? (
                <Check className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <AlertCircle className="h-3 w-3 text-gray-400 mr-1" />
              )}
              <span className={met ? 'text-green-600' : 'text-gray-500'}>
                {req.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};