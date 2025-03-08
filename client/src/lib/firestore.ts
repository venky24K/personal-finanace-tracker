import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';

// Transaction interface
export interface Transaction {
  id?: string;
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: 'income' | 'expense';
  createdAt?: Date;
}

// Budget interface
export interface Budget {
  id?: string;
  userId: string;
  category: string;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdAt?: Date;
}

// Category interface
export interface Category {
  id?: string;
  name: string;
  type: 'income' | 'expense';
  userId: string;
  createdAt?: Date;
}

// Helper function to convert Firestore timestamp to Date
export const firestoreTimestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

// Helper function to convert Firestore documents to our model type
const convertDoc = <T>(doc: any): T => {
  const data = doc.data();
  
  // Convert any timestamps to dates
  Object.keys(data).forEach(key => {
    if (data[key] instanceof Timestamp) {
      data[key] = data[key].toDate();
    }
  });
  
  return { id: doc.id, ...data } as T;
};

// Transaction operations
export const addTransaction = async (transaction: Transaction): Promise<string> => {
  const transactionData = {
    ...transaction,
    createdAt: serverTimestamp(),
    date: Timestamp.fromDate(transaction.date) as any
  };
  
  const docRef = await addDoc(collection(db, 'transactions'), transactionData);
  return docRef.id;
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertDoc<Transaction>(doc));
};

export const getTransaction = async (id: string): Promise<Transaction | null> => {
  const docRef = doc(db, 'transactions', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return convertDoc<Transaction>(docSnap);
};

export const updateTransaction = async (id: string, data: Partial<Transaction>): Promise<void> => {
  const docRef = doc(db, 'transactions', id);
  
  // Create a new object to avoid modifying the original data
  const updateData = { ...data };
  
  // Convert date to Timestamp if it exists
  if (updateData.date) {
    updateData.date = Timestamp.fromDate(updateData.date as Date) as any;
  }
  
  await updateDoc(docRef, updateData);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const docRef = doc(db, 'transactions', id);
  await deleteDoc(docRef);
};

// Budget operations
export const addBudget = async (budget: Budget): Promise<string> => {
  const budgetData = {
    ...budget,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, 'budgets'), budgetData);
  return docRef.id;
};

export const getBudgets = async (userId: string): Promise<Budget[]> => {
  const q = query(
    collection(db, 'budgets'),
    where('userId', '==', userId)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertDoc<Budget>(doc));
};

export const getBudget = async (id: string): Promise<Budget | null> => {
  const docRef = doc(db, 'budgets', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return convertDoc<Budget>(docSnap);
};

export const updateBudget = async (id: string, data: Partial<Budget>): Promise<void> => {
  const docRef = doc(db, 'budgets', id);
  await updateDoc(docRef, data);
};

export const deleteBudget = async (id: string): Promise<void> => {
  const docRef = doc(db, 'budgets', id);
  await deleteDoc(docRef);
};

// Category operations
export const addCategory = async (category: Category): Promise<string> => {
  const categoryData = {
    ...category,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, 'categories'), categoryData);
  return docRef.id;
};

export const getCategories = async (userId: string): Promise<Category[]> => {
  const q = query(
    collection(db, 'categories'),
    where('userId', '==', userId)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertDoc<Category>(doc));
};

export const getCategoriesByType = async (userId: string, type: 'income' | 'expense'): Promise<Category[]> => {
  const q = query(
    collection(db, 'categories'),
    where('userId', '==', userId),
    where('type', '==', type)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertDoc<Category>(doc));
};

export const updateCategory = async (id: string, data: Partial<Category>): Promise<void> => {
  const docRef = doc(db, 'categories', id);
  await updateDoc(docRef, data);
};

export const deleteCategory = async (id: string): Promise<void> => {
  const docRef = doc(db, 'categories', id);
  await deleteDoc(docRef);
};

// Analytics operations
export const getTransactionsByPeriod = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> => {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => convertDoc<Transaction>(doc));
};

export const getMonthlyTotals = async (
  userId: string, 
  year: number
): Promise<{ month: number; incomeTotal: number; expenseTotal: number }[]> => {
  // Get start and end dates for the year
  const startDate = new Date(year, 0, 1); // January 1
  const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31, 23:59:59
  
  // Get all transactions for the year
  const transactions = await getTransactionsByPeriod(userId, startDate, endDate);
  
  // Initialize monthly totals array
  const monthlyTotals: { month: number; incomeTotal: number; expenseTotal: number }[] = Array.from(
    { length: 12 },
    (_, i) => ({ month: i + 1, incomeTotal: 0, expenseTotal: 0 })
  );
  
  // Calculate totals for each month
  transactions.forEach(transaction => {
    const month = transaction.date.getMonth();
    if (transaction.type === 'income') {
      monthlyTotals[month].incomeTotal += transaction.amount;
    } else {
      monthlyTotals[month].expenseTotal += transaction.amount;
    }
  });
  
  return monthlyTotals;
};