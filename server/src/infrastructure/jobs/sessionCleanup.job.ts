import { AuthRepository } from '@/repositories/AuthRepository';

export function createSessionCleanupJob(authRepository: AuthRepository, intervalMs: number) {
    let isRunning = true;

    const cleanup = async () => {
        if (!isRunning) return;

        try {
            await authRepository.deleteExpiredSessions();
            console.log('[SessionCleanup] Expired sessions cleaned up');
        } catch (error) {
            console.error('[SessionCleanup] Error cleaning up sessions:', error);
        }
    };

    const intervalId = setInterval(cleanup, intervalMs);

    return {
        start: () => {
            isRunning = true;
            console.log('[SessionCleanup] Started');
        },
        stop: () => {
            isRunning = false;
            clearInterval(intervalId);
            console.log('[SessionCleanup] Stopped');
        },
    };
}
