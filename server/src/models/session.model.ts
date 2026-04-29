export interface Session {
    id: string;
    url: string;
    userAgent: string;
    ipAddress: string;
    startedAt: number;
    lastEventAt: number;
    eventCount: number;
    userId: string;
}

export interface SessionWithEvents extends Session {
    events: any[];
}
