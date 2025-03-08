import { firestore } from './firebaseAdmin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Collection references
const usersCollection = firestore.collection('users');
const transactionsCollection = firestore.collection('transactions');
const budgetsCollection = firestore.collection('budgets');
const categoriesCollection = firestore.collection('categories');

// User profile interface
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
}

// Transaction interface
export interface Transaction {
  id?: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: 'income' | 'expense';
  createdAt: Date;
}

// Budget interface
export interface Budget {
  id?: string;
  userId: string;
  category: string;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdAt: Date;
}

// Category interface
export interface Category {
  id?: string;
  name: string;
  type: 'income' | 'expense';
  userId: string;
  createdAt: Date;
}

// Helper function to convert Firestore timestamps to Date objects
const convertTimestamps = (data: any): any => {
  if (!data) return null;
  
  Object.keys(data).forEach(key => {
    if (data[key] instanceof Timestamp) {
      data[key] = data[key].toDate();
    } else if (data[key] && typeof data[key] === 'object') {
      data[key] = convertTimestamps(data[key]);
    }
  });
  
  return data;
};

// User profile operations
export const createUserProfile = async (userProfile: UserProfile): Promise<string> => {
  const userData = {
    ...userProfile,
    createdAt: FieldValue.serverTimestamp()
  };
  
  const docRef = await usersCollection.doc(userProfile.uid).set(userData);
  return userProfile.uid;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userDoc = await usersCollection.doc(uid).get();
  
  if (!userDoc.exists) {
    return null;
  }
  
  return convertTimestamps({ id: userDoc.id, ...userDoc.data() }) as UserProfile;
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  await usersCollection.doc(uid).update(data);
};

// Transaction operations
export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    console.log(`[Firestore] Getting transactions for user ${userId}`);
    
    // First get transactions by userId without sorting
    const snapshot = await transactionsCollection
      .where('userId', '==', userId)
      .get();
    
    console.log(`[Firestore] Found ${snapshot.docs.length} transactions`);
    
    // Convert to Transaction objects with proper date handling
    const transactions = snapshot.docs.map(doc => {
      return convertTimestamps({ id: doc.id, ...doc.data() }) as Transaction;
    });
    
    // Sort in memory instead of in query to avoid needing a composite index
    return transactions.sort((a, b) => {
      // Sort by date in descending order (most recent first)
      return b.date.getTime() - a.date.getTime();
    });
  } catch (error) {
    console.error('[Firestore] Error fetching transactions:', error);
    throw error;
  }
};

export const getTransaction = async (id: string): Promise<Transaction | null> => {
  const doc = await transactionsCollection.doc(id).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return convertTimestamps({ id: doc.id, ...doc.data() }) as Transaction;
};

export const createTransaction = async (transaction: Transaction): Promise<string> => {
  try {
    console.log('[Firestore] Creating transaction:', transaction);
    
    const transactionData = {
      ...transaction,
      createdAt: FieldValue.serverTimestamp()
    };
    
    console.log('[Firestore] Processed transaction data:', transactionData);
    const docRef = await transactionsCollection.add(transactionData);
    console.log(`[Firestore] Transaction created with ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('[Firestore] Error creating transaction:', error);
    throw error;
  }
};

export const updateTransaction = async (id: string, data: Partial<Transaction>): Promise<void> => {
  await transactionsCollection.doc(id).update(data);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await transactionsCollection.doc(id).delete();
};

// Budget operations
export const getBudgets = async (userId: string): Promise<Budget[]> => {
  const snapshot = await budgetsCollection
    .where('userId', '==', userId)
    .get();
  
  return snapshot.docs.map(doc => {
    return convertTimestamps({ id: doc.id, ...doc.data() }) as Budget;
  });
};

export const getBudget = async (id: string): Promise<Budget | null> => {
  const doc = await budgetsCollection.doc(id).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return convertTimestamps({ id: doc.id, ...doc.data() }) as Budget;
};

export const createBudget = async (budget: Budget): Promise<string> => {
  const budgetData = {
    ...budget,
    createdAt: FieldValue.serverTimestamp()
  };
  
  const docRef = await budgetsCollection.add(budgetData);
  return docRef.id;
};

export const updateBudget = async (id: string, data: Partial<Budget>): Promise<void> => {
  await budgetsCollection.doc(id).update(data);
};

export const deleteBudget = async (id: string): Promise<void> => {
  await budgetsCollection.doc(id).delete();
};

// Category operations
export const getCategories = async (userId: string): Promise<Category[]> => {
  const snapshot = await categoriesCollection
    .where('userId', '==', userId)
    .get();
  
  return snapshot.docs.map(doc => {
    return convertTimestamps({ id: doc.id, ...doc.data() }) as Category;
  });
};

export const getCategoriesByType = async (userId: string, type: 'income' | 'expense'): Promise<Category[]> => {
  const snapshot = await categoriesCollection
    .where('userId', '==', userId)
    .where('type', '==', type)
    .get();
  
  return snapshot.docs.map(doc => {
    return convertTimestamps({ id: doc.id, ...doc.data() }) as Category;
  });
};

export const createCategory = async (category: Category): Promise<string> => {
  const categoryData = {
    ...category,
    createdAt: FieldValue.serverTimestamp()
  };
  
  const docRef = await categoriesCollection.add(categoryData);
  return docRef.id;
};

export const updateCategory = async (id: string, data: Partial<Category>): Promise<void> => {
  await categoriesCollection.doc(id).update(data);
};

export const deleteCategory = async (id: string): Promise<void> => {
  await categoriesCollection.doc(id).delete();
};

// Additional analytics operations
export const getTransactionsByPeriod = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> => {
  try {
    // Get all transactions for the user
    const snapshot = await transactionsCollection
      .where('userId', '==', userId)
      .get();
    
    // Convert to Transaction objects with proper date handling
    const allTransactions = snapshot.docs.map(doc => {
      return convertTimestamps({ id: doc.id, ...doc.data() }) as Transaction;
    });
    
    // Filter by date range in memory
    const filteredTransactions = allTransactions.filter(transaction => {
      const transactionDate = transaction.date;
      return transactionDate >= startDate && transactionDate <= endDate;
    });
    
    // Sort in memory
    return filteredTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    console.error('[Firestore] Error fetching transactions by period:', error);
    throw error;
  }
};

export const getTotalsByCategory = async (
  userId: string,
  type: 'income' | 'expense',
  startDate: Date,
  endDate: Date
): Promise<{ category: string; total: number }[]> => {
  const transactions = await getTransactionsByPeriod(userId, startDate, endDate);
  
  // Filter by type and group by category
  const typeTransactions = transactions.filter(t => t.type === type);
  const categoryTotals: Record<string, number> = {};
  
  typeTransactions.forEach(transaction => {
    if (!categoryTotals[transaction.category]) {
      categoryTotals[transaction.category] = 0;
    }
    categoryTotals[transaction.category] += transaction.amount;
  });
  
  // Convert to array format
  return Object.entries(categoryTotals).map(([category, total]) => ({
    category,
    total
  }));
};