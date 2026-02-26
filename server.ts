import express from "express";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { GoogleGenAI, Type } from "@google/genai";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey123";

// --- AI Setup ---
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

async function analyzeProblemAI(text: string) {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this citizen feedback and return ONLY a valid JSON object with no extra text: 
      Feedback: '${text}' 
      Return format: { 
        "sentiment_label": "Positive|Neutral|Negative", 
        "sentiment_score": float -1 to 1, 
        "priority_score": float 0 to 10, 
        "is_urgent": boolean, 
        "category": "Water|Roads|Garbage|Electricity|Other",
        "cluster_suggestion": "one word topic" 
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment_label: { type: Type.STRING },
            sentiment_score: { type: Type.NUMBER },
            priority_score: { type: Type.NUMBER },
            is_urgent: { type: Type.BOOLEAN },
            category: { type: Type.STRING },
            cluster_suggestion: { type: Type.STRING }
          },
          required: ["sentiment_label", "sentiment_score", "priority_score", "is_urgent", "category", "cluster_suggestion"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      sentiment_label: "Neutral",
      sentiment_score: 0,
      priority_score: 5,
      is_urgent: false,
      category: "Other",
      cluster_suggestion: "General"
    };
  }
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(cookieParser());

  // --- Rate Limiting ---
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: "Too many attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };

  const authorize = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };

  // --- Auth Routes ---
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    try {
      console.log(`[DEBUG] Registering user: ${email}`);
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { name, email, password: hashedPassword, role }
      });
      console.log(`[DEBUG] User registered successfully: ${email}`);
      res.json({ success: true, message: "Registration successful. Please login." });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: "Email already exists" });
      }
      console.error(error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    console.log(`[DEBUG] Login attempt for: ${email}`);
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log(`[DEBUG] User not found: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log(`[DEBUG] User found: ${user.email}`);
    const isValid = await bcrypt.compare(password, user.password);
    console.log(`[DEBUG] Password comparison result for ${email}: ${isValid}`);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
    );
    console.log(`[DEBUG] Token created for: ${user.email}`);

    // Store token in HTTP-only cookie as requested
    res.setHeader("Set-Cookie", `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=None; Secure`);
    
    res.json({ id: user.id, name: user.name, role: user.role });
  });

  app.post("/api/auth/logout", async (req, res) => {
    res.setHeader("Set-Cookie", "token=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json(req.user);
  });

  // --- Problem Routes ---
  app.get("/api/stats", authenticate, async (req: any, res) => {
    const isMunicipal = req.user.role === 'municipal_admin';
    const userId = req.user.id;

    let totalProblems, activeProblems, resolvedProblems, urgentAlerts;

    if (isMunicipal) {
      totalProblems = await prisma.problem.count();
      activeProblems = await prisma.problem.count({ where: { status: { not: "Resolved" } } });
      resolvedProblems = await prisma.problem.count({ where: { status: "Resolved" } });
      urgentAlerts = await prisma.problem.count({ where: { is_urgent: true, status: { not: "Resolved" } } });
    } else {
      totalProblems = await prisma.problem.count({ where: { user_id: userId } });
      activeProblems = await prisma.problem.count({ where: { user_id: userId, status: { not: "Resolved" } } });
      resolvedProblems = await prisma.problem.count({ where: { user_id: userId, status: "Resolved" } });
      urgentAlerts = await prisma.problem.count({ where: { user_id: userId, is_urgent: true, status: { not: "Resolved" } } });
    }

    const avgSentimentResult = await prisma.problem.aggregate({
      _avg: { sentiment_score: true }
    });
    const activeClusters = await prisma.cluster.count();

    // --- Historical Trends (Last 30 Days) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const problems = await prisma.problem.findMany({
      where: {
        created_at: { gte: thirtyDaysAgo },
        ...(isMunicipal ? {} : { user_id: userId })
      },
      select: { created_at: true, status: true, resolved_at: true }
    });

    const trendMap: Record<string, { active: number, resolved: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap[dateStr] = { active: 0, resolved: 0 };
    }

    problems.forEach(p => {
      const createdDate = p.created_at.toISOString().split('T')[0];
      if (trendMap[createdDate]) {
        if (p.status !== 'Resolved') trendMap[createdDate].active++;
      }
      if (p.resolved_at) {
        const resolvedDate = p.resolved_at.toISOString().split('T')[0];
        if (trendMap[resolvedDate]) trendMap[resolvedDate].resolved++;
      }
    });

    const trends = Object.entries(trendMap)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- Resolution Times by Category ---
    const resolutionTimesRaw = await prisma.resolvedComment.findMany({
      include: {
        problem: {
          select: { category: true }
        }
      }
    });

    const resolutionTimesMap: Record<string, { total: number, count: number }> = {};
    resolutionTimesRaw.forEach(c => {
      const cat = c.problem.category;
      if (!resolutionTimesMap[cat]) resolutionTimesMap[cat] = { total: 0, count: 0 };
      resolutionTimesMap[cat].total += c.time_taken || 0;
      resolutionTimesMap[cat].count += 1;
    });

    const resolutionTimes = Object.entries(resolutionTimesMap).map(([category, data]) => ({
      category,
      avg_time: Math.round((data.total / data.count) / 3600) // in hours
    }));

    res.json({
      totalProblems,
      activeProblems,
      resolvedProblems,
      avgSentiment: avgSentimentResult._avg.sentiment_score || 0,
      urgentAlerts,
      activeClusters,
      trends,
      resolutionTimes
    });
  });

  app.get("/api/problems", authenticate, async (req: any, res) => {
    const { cluster_id } = req.query;
    const isMunicipal = req.user.role === 'municipal_admin';
    const userId = req.user.id;

    const where: any = {};
    if (!isMunicipal) {
      where.user_id = userId;
    }
    if (cluster_id) {
      where.cluster_id = parseInt(cluster_id as string);
    }

    const problems = await prisma.problem.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    // Map to include citizen_name for frontend compatibility
    const formattedProblems = problems.map(p => ({
      ...p,
      citizen_name: p.user.name
    }));

    res.json(formattedProblems);
  });

  app.post("/api/problems", authenticate, authorize(['citizen_admin']), async (req: any, res) => {
    const { title, description, category, location, image_url, analysis } = req.body;
    try {
      let cluster = await prisma.cluster.findFirst({
        where: { cluster_name: { contains: analysis.cluster_suggestion } }
      });

      if (!cluster) {
        cluster = await prisma.cluster.create({
          data: { cluster_name: analysis.cluster_suggestion, area: location }
        });
      }

      const id = uuidv4();
      await prisma.problem.create({
        data: {
          id,
          user_id: req.user.id,
          title,
          description,
          category,
          location,
          image_url,
          sentiment_score: analysis.sentiment_score,
          sentiment_label: analysis.sentiment_label,
          priority_score: analysis.priority_score,
          is_urgent: analysis.is_urgent,
          cluster_id: cluster.id
        }
      });

      // Update cluster stats
      const problemCount = await prisma.problem.count({ where: { cluster_id: cluster.id } });
      const avgSentiment = await prisma.problem.aggregate({
        where: { cluster_id: cluster.id },
        _avg: { sentiment_score: true }
      });

      await prisma.cluster.update({
        where: { id: cluster.id },
        data: {
          problem_count: problemCount,
          avg_sentiment: avgSentiment._avg.sentiment_score || 0
        }
      });

      res.json({ id, ...analysis });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save problem" });
    }
  });

  app.patch("/api/problems/:id/status", authenticate, authorize(['municipal_admin']), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      if (status === 'Resolved') {
        await prisma.problem.update({
          where: { id },
          data: { status, resolved_at: new Date() }
        });
      } else {
        await prisma.problem.update({
          where: { id },
          data: { status }
        });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // --- Comment Routes ---
  app.post("/api/problems/:id/comment", authenticate, authorize(['citizen_admin']), async (req: any, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    try {
      const problem = await prisma.problem.findUnique({ where: { id } });
      if (!problem || !problem.resolved_at) return res.status(400).json({ error: "Problem not resolved" });

      const timeTaken = Math.floor((new Date(problem.resolved_at).getTime() - new Date(problem.created_at).getTime()) / 1000);
      
      const commentId = uuidv4();
      await prisma.resolvedComment.create({
        data: {
          id: commentId,
          problem_id: id,
          citizen_id: req.user.id,
          rating,
          comment,
          time_taken: timeTaken
        }
      });
      res.json({ success: true, time_taken: timeTaken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save comment" });
    }
  });

  app.get("/api/problems/:id/comment", authenticate, async (req, res) => {
    const { id } = req.params;
    const comment = await prisma.resolvedComment.findFirst({ where: { problem_id: id } });
    res.json(comment || null);
  });

  // --- Messaging Routes ---
  app.get("/api/messages", authenticate, async (req: any, res) => {
    const userId = req.user.id;
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { sender_id: userId },
          { receiver_id: userId }
        ]
      },
      include: {
        sender: { select: { name: true, role: true } },
        receiver: { select: { name: true, role: true } },
        problem: { select: { title: true } }
      },
      orderBy: { created_at: 'asc' }
    });
    res.json(messages);
  });

  app.post("/api/messages", authenticate, async (req: any, res) => {
    const { receiver_id, problem_id, message_text } = req.body;
    if (!receiver_id || !message_text) {
      return res.status(400).json({ error: "Receiver and message text are required" });
    }

    try {
      const message = await prisma.message.create({
        data: {
          sender_id: req.user.id,
          receiver_id: parseInt(receiver_id),
          problem_id,
          message_text
        }
      });
      res.json(message);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/users", authenticate, async (req: any, res) => {
    const isMunicipal = req.user.role === 'municipal_admin';
    const users = await prisma.user.findMany({
      where: {
        role: isMunicipal ? 'citizen_admin' : 'municipal_admin'
      },
      select: { id: true, name: true, role: true }
    });
    res.json(users);
  });

  // --- Analytics Routes ---
  app.get("/api/clusters", authenticate, async (req, res) => {
    const clusters = await prisma.cluster.findMany();
    res.json(clusters);
  });

  app.post("/api/ai/analyze", authenticate, async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });
    const analysis = await analyzeProblemAI(text);
    res.json(analysis);
  });

  app.get("/api/reports/strategic", authenticate, async (req, res) => {
    const commonIssues = await prisma.problem.groupBy({
      by: ['category'],
      _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
      take: 5
    });

    const negativeSentimentAreas = await prisma.problem.groupBy({
      by: ['location'],
      _avg: { sentiment_score: true },
      orderBy: { _avg: { sentiment_score: 'asc' } },
      take: 5
    });

    const resolutionTimesRaw = await prisma.resolvedComment.findMany({
      include: {
        problem: {
          select: { category: true }
        }
      }
    });

    const resolutionTimesMap: Record<string, { total: number, count: number }> = {};
    resolutionTimesRaw.forEach(c => {
      const cat = c.problem.category;
      if (!resolutionTimesMap[cat]) resolutionTimesMap[cat] = { total: 0, count: 0 };
      resolutionTimesMap[cat].total += c.time_taken || 0;
      resolutionTimesMap[cat].count += 1;
    });

    const resolutionTimes = Object.entries(resolutionTimesMap).map(([category, data]) => ({
      category,
      avg_time: data.total / data.count
    }));

    // Generate AI Summary
    const dataSummary = `
      Common Issues: ${JSON.stringify(commonIssues)}
      Negative Sentiment Areas: ${JSON.stringify(negativeSentimentAreas)}
      Resolution Efficiency: ${JSON.stringify(resolutionTimes)}
    `;

    let aiSummary = "Strategic insights are being generated based on real-time data.";
    try {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `You are a Municipal Strategic Analyst. Based on this city data:
        ${dataSummary}
        
        Provide a concise strategic report for the Municipal Admin. 
        Include:
        1. The most critical issue currently facing the city.
        2. The area with the highest citizen dissatisfaction.
        3. A recommendation for improving resolution efficiency.
        
        Format as clear, professional bullet points.`,
      });
      aiSummary = response.text || aiSummary;
    } catch (error) {
      console.error("AI Strategic Report Error:", error);
    }

    res.json({ 
      commonIssues: commonIssues.map(i => ({ category: i.category, count: i._count._all })), 
      negativeSentimentAreas: negativeSentimentAreas.map(a => ({ location: a.location, avg: a._avg.sentiment_score })), 
      resolutionTimes,
      aiSummary
    });
  });

  // API 404 fallback to prevent HTML responses for API calls
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
