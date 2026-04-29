declare module 'swagger-jsdoc' {
    const swaggerJsdoc: (options: {
        definition: {
            openapi: string;
            info: { title: string; version: string; description?: string };
            servers?: { url: string; description?: string }[];
            components?: Record<string, unknown>;
            paths?: Record<string, unknown>;
        };
        apis: string[];
    }) => unknown;
    export default swaggerJsdoc;
}

declare module 'swagger-ui-express' {
    import { Application } from 'express';
    const swaggerUi: {
        serve: Application[];
        setup: (spec: unknown, options?: unknown) => Application;
    };
    export default swaggerUi;
}
