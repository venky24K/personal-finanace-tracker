import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Interface for Transaction data
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'income' | 'expense';
  createdAt: string;
}

export const Dashboard: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  
  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading, refetch } = useQuery({
    queryKey: ['/api/transactions'],
    enabled: !!currentUser,
  });
  
  // Calculate totals when transactions data changes
  useEffect(() => {
    if (transactions && Array.isArray(transactions) && transactions.length > 0) {
      let income = 0;
      let expenses = 0;
      
      transactions.forEach((transaction: Transaction) => {
        if (transaction.type === 'income') {
          income += transaction.amount;
        } else {
          expenses += transaction.amount;
        }
      });
      
      setTotalIncome(income);
      setTotalExpenses(expenses);
      setTotalBalance(income - expenses);
    }
  }, [transactions]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      setLocation('/auth');
    }
  }, [currentUser, loading, setLocation]);

  // Function to refresh transaction list
  const refreshTransactions = () => {
    // Refetch transactions when a new one is added
    refetch();
    setActiveTab('transactions');
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  // Show loading state or nothing if redirecting
  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Dashboard</h1>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentUser?.email && `Logged in as ${currentUser.email}`}
            </div>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="add-transaction">Add Transaction</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    <CardDescription>Your net worth</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactionsLoading ? (
                      <div className="text-2xl font-bold animate-pulse">Loading...</div>
                    ) : (
                      <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalBalance)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Updated just now
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Income</CardTitle>
                    <CardDescription>All time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactionsLoading ? (
                      <div className="text-2xl font-bold animate-pulse">Loading...</div>
                    ) : (
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(totalIncome)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Total from {transactions && Array.isArray(transactions) 
                        ? transactions.filter((t: Transaction) => t.type === 'income').length 
                        : 0} transactions
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                    <CardDescription>All time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactionsLoading ? (
                      <div className="text-2xl font-bold animate-pulse">Loading...</div>
                    ) : (
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(totalExpenses)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Total from {transactions && Array.isArray(transactions) 
                        ? transactions.filter((t: Transaction) => t.type === 'expense').length 
                        : 0} transactions
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Your latest financial activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TransactionList limit={5} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Budget Overview</CardTitle>
                    <CardDescription>Your spending against budgeted amounts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground">No budgets found. Add your first budget to start tracking.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="transactions">
              <TransactionList />
            </TabsContent>
            
            <TabsContent value="add-transaction">
              <TransactionForm onSuccess={refreshTransactions} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
