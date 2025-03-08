import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import ResetEmailSent from '@/components/auth/ResetEmailSent';

// Define the possible view states for auth page
type AuthView = 'login' | 'register' | 'forgotPassword' | 'resetEmailSent';

export const AuthPage: React.FC = () => {
  const [view, setView] = useState<AuthView>('login');
  const [resetEmail, setResetEmail] = useState('');
  const { currentUser } = useAuth();
  const [location, setLocation] = useLocation();
  
  // If user is already logged in, redirect to dashboard
  if (currentUser) {
    setLocation('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-grow flex items-center justify-center">
        <div className="max-w-md w-full px-4 py-12">
          {view === 'login' && (
            <LoginForm 
              onShowRegister={() => setView('register')}
              onShowForgotPassword={() => setView('forgotPassword')}
            />
          )}
          
          {view === 'register' && (
            <RegisterForm 
              onShowLogin={() => setView('login')}
            />
          )}
          
          {view === 'forgotPassword' && (
            <ForgotPasswordForm 
              onShowLogin={() => setView('login')}
              onResetSent={(email) => {
                setResetEmail(email);
                setView('resetEmailSent');
              }}
            />
          )}
          
          {view === 'resetEmailSent' && (
            <ResetEmailSent 
              email={resetEmail}
              onBackToLogin={() => setView('login')}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default AuthPage;
