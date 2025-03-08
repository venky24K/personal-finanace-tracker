import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';
import { Link } from 'wouter';

const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Wallet className="h-6 w-6 text-primary mr-2" />
            <Link href="/dashboard" className="text-xl font-semibold text-gray-900">
              Personal Finance Tracker
            </Link>
          </div>
          
          {currentUser && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{currentUser.email}</span>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-600 hover:text-primary"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
