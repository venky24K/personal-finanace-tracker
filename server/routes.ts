import express, { type Request as ExpressRequest, Response, NextFunction } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { auth, firestore } from "./firebaseAdmin";

// Extend the Request type to include user property
interface Request extends ExpressRequest {
  user?: {
    uid: string;
  };
}

// Export Firestore for convenience
export const db = firestore;

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();

  // ----- User Authentication Routes -----

  // Create user route
  apiRouter.post("/users", async (req: Request, res: Response) => {
    try {
      // Validate the request body against the schema
      const userData = insertUserSchema.parse(req.body);
      
      // Check if a user with the same email already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Create the user
      const user = await storage.createUser(userData);
      
      // Return the created user (without the password)
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user", error: error.message });
    }
  });

  // Verify Firebase token
  apiRouter.post("/auth/verify-token", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      try {
        const decodedToken = await auth.verifyIdToken(token);
        res.json({ uid: decodedToken.uid });
      } catch (error: any) {
        res.status(401).json({ message: "Invalid token", error: error.message });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  // User profile endpoint
  apiRouter.get("/users/profile", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;
        
        // Get user from storage by Firebase UID
        const user = await storage.getUserByFirebaseUid(uid);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Return user profile without sensitive info
        const { password, ...safeUser } = user;
        res.json(safeUser);
      } catch (error: any) {
        res.status(401).json({ message: "Invalid token", error: error.message });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  // ----- Firestore Finance Routes -----

  // Middleware to verify authentication for all finance routes
  const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = { uid: decodedToken.uid }; // Attach user to request
        next();
      } catch (error: any) {
        res.status(401).json({ message: "Invalid token", error: error.message });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };

  // Import Firestore functions
  const {
    getTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getBudgets,
    getBudget,
    createBudget,
    updateBudget,
    deleteBudget,
    getCategories,
    getCategoriesByType,
    createCategory,
    updateCategory,
    deleteCategory,
    getTotalsByCategory,
    getTransactionsByPeriod
  } = await import('./firestore');

  // ----- Transaction Routes -----
  
  // Get all transactions for a user
  apiRouter.get("/transactions", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log(`Fetching transactions for user: ${req.user!.uid}`);
      const transactions = await getTransactions(req.user!.uid);
      console.log(`Found ${transactions.length} transactions`);
      res.json(transactions);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ message: "Failed to fetch transactions", error: error.message });
    }
  });

  // Get a specific transaction
  apiRouter.get("/transactions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const transaction = await getTransaction(req.params.id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Verify the transaction belongs to the user
      if (transaction.userId !== req.user.uid) {
        return res.status(403).json({ message: "Not authorized to access this transaction" });
      }
      
      res.json(transaction);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch transaction", error: error.message });
    }
  });

  // Create a new transaction
  apiRouter.post("/transactions", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log(`Creating transaction for user: ${req.user!.uid}`);
      console.log('Transaction data:', req.body);
      
      const transactionData = {
        ...req.body,
        userId: req.user!.uid,
        date: new Date(req.body.date) // Convert string date to Date object
      };
      
      console.log('Processed transaction data:', transactionData);
      const id = await createTransaction(transactionData);
      console.log('Transaction created with ID:', id);
      
      res.status(201).json({ id, ...transactionData });
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      res.status(500).json({ message: "Failed to create transaction", error: error.message });
    }
  });

  // Update a transaction
  apiRouter.put("/transactions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const transaction = await getTransaction(req.params.id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Verify the transaction belongs to the user
      if (transaction.userId !== req.user.uid) {
        return res.status(403).json({ message: "Not authorized to update this transaction" });
      }
      
      // If date is provided, convert string to Date
      if (req.body.date) {
        req.body.date = new Date(req.body.date);
      }
      
      await updateTransaction(req.params.id, req.body);
      res.json({ message: "Transaction updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update transaction", error: error.message });
    }
  });

  // Delete a transaction
  apiRouter.delete("/transactions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const transaction = await getTransaction(req.params.id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Verify the transaction belongs to the user
      if (transaction.userId !== req.user.uid) {
        return res.status(403).json({ message: "Not authorized to delete this transaction" });
      }
      
      await deleteTransaction(req.params.id);
      res.json({ message: "Transaction deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete transaction", error: error.message });
    }
  });

  // ----- Budget Routes -----
  
  // Get all budgets for a user
  apiRouter.get("/budgets", authenticateUser, async (req: Request, res: Response) => {
    try {
      const budgets = await getBudgets(req.user.uid);
      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch budgets", error: error.message });
    }
  });

  // Get a specific budget
  apiRouter.get("/budgets/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const budget = await getBudget(req.params.id);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      // Verify the budget belongs to the user
      if (budget.userId !== req.user.uid) {
        return res.status(403).json({ message: "Not authorized to access this budget" });
      }
      
      res.json(budget);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch budget", error: error.message });
    }
  });

  // Create a new budget
  apiRouter.post("/budgets", authenticateUser, async (req: Request, res: Response) => {
    try {
      const budgetData = {
        ...req.body,
        userId: req.user.uid
      };
      
      const id = await createBudget(budgetData);
      res.status(201).json({ id, ...budgetData });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create budget", error: error.message });
    }
  });

  // Update a budget
  apiRouter.put("/budgets/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const budget = await getBudget(req.params.id);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      // Verify the budget belongs to the user
      if (budget.userId !== req.user.uid) {
        return res.status(403).json({ message: "Not authorized to update this budget" });
      }
      
      await updateBudget(req.params.id, req.body);
      res.json({ message: "Budget updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update budget", error: error.message });
    }
  });

  // Delete a budget
  apiRouter.delete("/budgets/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const budget = await getBudget(req.params.id);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      // Verify the budget belongs to the user
      if (budget.userId !== req.user.uid) {
        return res.status(403).json({ message: "Not authorized to delete this budget" });
      }
      
      await deleteBudget(req.params.id);
      res.json({ message: "Budget deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete budget", error: error.message });
    }
  });

  // ----- Category Routes -----
  
  // Get all categories for a user
  apiRouter.get("/categories", authenticateUser, async (req: Request, res: Response) => {
    try {
      const categories = await getCategories(req.user.uid);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch categories", error: error.message });
    }
  });

  // Get categories by type (income/expense)
  apiRouter.get("/categories/type/:type", authenticateUser, async (req: Request, res: Response) => {
    try {
      const type = req.params.type as 'income' | 'expense';
      
      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: "Type must be either 'income' or 'expense'" });
      }
      
      const categories = await getCategoriesByType(req.user.uid, type);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch categories", error: error.message });
    }
  });

  // Create a new category
  apiRouter.post("/categories", authenticateUser, async (req: Request, res: Response) => {
    try {
      const categoryData = {
        ...req.body,
        userId: req.user.uid
      };
      
      const id = await createCategory(categoryData);
      res.status(201).json({ id, ...categoryData });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create category", error: error.message });
    }
  });

  // Update a category
  apiRouter.put("/categories/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Implement category ownership check here
      await updateCategory(req.params.id, req.body);
      res.json({ message: "Category updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update category", error: error.message });
    }
  });

  // Delete a category
  apiRouter.delete("/categories/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Implement category ownership check here
      await deleteCategory(req.params.id);
      res.json({ message: "Category deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete category", error: error.message });
    }
  });

  // ----- Analytics Routes -----
  
  // Get transactions by period
  apiRouter.get("/analytics/transactions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const transactions = await getTransactionsByPeriod(
        req.user.uid,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch transactions", error: error.message });
    }
  });

  // Get totals by category
  apiRouter.get("/analytics/category-totals", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { type, startDate, endDate } = req.query;
      
      if (!type || !startDate || !endDate) {
        return res.status(400).json({ 
          message: "Type, start date, and end date are required" 
        });
      }
      
      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ 
          message: "Type must be either 'income' or 'expense'" 
        });
      }
      
      const totals = await getTotalsByCategory(
        req.user.uid,
        type as 'income' | 'expense',
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(totals);
    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to fetch category totals", 
        error: error.message 
      });
    }
  });

  // Mount the API router
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
