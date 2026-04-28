import type { RecorderState } from '@/types';
import { type PropsWithChildren, createContext, useContext } from 'react';

export interface RecorderContextValue {
    sessionId: string;
    recordingState: RecorderState;
    emitCustomEvent: (tag: string, payload: unknown) => void;
}

const RecorderContext = createContext<RecorderContextValue | null>(null);

export function RecorderProvider({
    value,
    children,
}: PropsWithChildren<{ value: RecorderContextValue }>) {
    return <RecorderContext.Provider value={value}>{children}</RecorderContext.Provider>;
}

export function useRecorderStatus() {
    const context = useContext(RecorderContext);

    if (!context) {
        throw new Error('useRecorderStatus must be used within RecorderProvider');
    }

    return context;
}
