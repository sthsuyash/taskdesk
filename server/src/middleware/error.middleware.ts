import { AppError } from '@/domain/errors/AppError';
import { NextFunction, Request, Response } from 'express';

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
    console.error(`[Error] ${req.method} ${req.url}`, err);

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
        });
    }

    if (err.code?.startsWith('P')) {
        return res.status(400).json({ error: 'Database operation failed' });
    }

    res.status(500).json({
        error: 'Internal server error',
    });
}
