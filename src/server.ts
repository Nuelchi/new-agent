import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import healthRouter from './routes/health';
import strategiesRouter from './routes/strategies';
import youtubeRouter from './routes/youtube';
import backtestRouter from './routes/backtest';
import exportRouter from './routes/export';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.use('/health', healthRouter);
app.use('/strategies', strategiesRouter);
app.use('/youtube', youtubeRouter);
app.use('/backtest', backtestRouter);
app.use('/export', exportRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'TrainFlow Backend', status: 'ok' });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.status || 500;
  const message = err?.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

const port = parseInt(process.env.PORT || '4000', 10);
app.listen(port, () => {
  console.log('Backend listening on http://localhost:' + port);
});
