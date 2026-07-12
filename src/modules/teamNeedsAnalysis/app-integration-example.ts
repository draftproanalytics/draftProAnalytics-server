// Example: src/app.ts or src/server.ts
// This shows how to integrate the TeamNeedsAnalysis module into your Express app

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { bootstrapTeamNeedsAnalysisModule } from '../teamNeedsAnalysis';

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(express.json());

// Bootstrap and mount the TeamNeedsAnalysis module
const teamNeedsRouter = bootstrapTeamNeedsAnalysisModule(prisma);
app.use('/api/team-needs', teamNeedsRouter);

// Other routes...
// app.use('/api/teams', teamRoutes);
// app.use('/api/players', playerRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});