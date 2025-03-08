import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Transaction interface
interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO date string
  type: 'income' | 'expense';
  createdAt: string;
}

interface TransactionListProps {
  limit?: number;
}

export const TransactionList = ({ limit }: TransactionListProps) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Use TanStack Query for data fetching
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['/api/transactions'],
    enabled: !!currentUser,
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Show transactions - apply limit if provided
  const displayTransactions = limit && transactions && Array.isArray(transactions)
    ? transactions.slice(0, limit) 
    : (transactions && Array.isArray(transactions) ? transactions : []);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Loading your transactions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-2">
                <div className="flex flex-col gap-1">
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="h-6 w-24 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500 p-2">
            Could not load transactions. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (displayTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>No transactions found. Add your first transaction to get started.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {limit ? 'Recent Transactions' : 'All Transactions'}
        </CardTitle>
        <CardDescription>
          {limit 
            ? 'Your most recent financial activities' 
            : `Showing ${displayTransactions.length} transactions`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayTransactions.map((transaction) => (
            <div key={transaction.id} className="flex justify-between items-center p-2 hover:bg-muted rounded-md">
              <div className="flex flex-col gap-1">
                <span className="font-medium">{transaction.description}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(transaction.date), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                  {transaction.type}
                </Badge>
                <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};