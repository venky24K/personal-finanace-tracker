import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ResetEmailSentProps {
  email: string;
  onBackToLogin: () => void;
}

export const ResetEmailSent: React.FC<ResetEmailSentProps> = ({ email, onBackToLogin }) => {
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a password reset link to <span className="font-medium">{email}</span>
          </p>
        </div>
        
        <div className="text-center">
          <Button 
            variant="link" 
            className="p-0 h-auto" 
            type="button"
            onClick={onBackToLogin}
          >
            Back to login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResetEmailSent;
