import swaggerJsdoc from 'swagger-jsdoc';
import type { Options } from 'swagger-jsdoc';

const swaggerOptions: Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Taskdesk API',
            version: '1.0.0',
            description: 'Backend API for Taskdesk - Task management and session recording',
        },
        servers: [
            {
                url: '/api',
                description: 'Current server',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'session_token',
                },
            },
            schemas: {
                AuthUser: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string', enum: ['user', 'support', 'admin'] },
                        createdAt: { type: 'number' },
                        updatedAt: { type: 'number' },
                    },
                },
                Task: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        status: { type: 'string', enum: ['todo', 'done'] },
                        createdAt: { type: 'number' },
                        updatedAt: { type: 'number' },
                        userId: { type: 'string' },
                    },
                },
                SessionSummary: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        url: { type: 'string' },
                        userAgent: { type: 'string' },
                        startedAt: { type: 'number' },
                        lastEventAt: { type: 'number' },
                        eventCount: { type: 'number' },
                        durationMs: { type: 'number' },
                        userId: { type: 'string' },
                        ipAddress: { type: 'string' },
                    },
                },
            },
        },
        paths: {
            '/auth/register': {
                post: {
                    summary: 'Register a new user',
                    tags: ['Authentication'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string', format: 'email' },
                                        password: { type: 'string', format: 'password' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'User created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AuthUser' },
                                },
                            },
                        },
                    },
                },
            },
            '/auth/login': {
                post: {
                    summary: 'Login user',
                    tags: ['Authentication'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string', format: 'email' },
                                        password: { type: 'string', format: 'password' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Login successful',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AuthUser' },
                                },
                            },
                        },
                    },
                },
            },
            '/auth/logout': {
                post: {
                    summary: 'Logout user',
                    tags: ['Authentication'],
                    security: [{ cookieAuth: [] }],
                    responses: {
                        200: { description: 'Logout successful' },
                    },
                },
            },
            '/auth/me': {
                get: {
                    summary: 'Get current user',
                    tags: ['Authentication'],
                    security: [{ cookieAuth: [] }],
                    responses: {
                        200: {
                            description: 'Current user',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/AuthUser' },
                                },
                            },
                        },
                    },
                },
            },
            '/tasks': {
                get: {
                    summary: 'List tasks',
                    tags: ['Tasks'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                        { name: 'status', in: 'query', schema: { type: 'string', enum: ['todo', 'done'] } },
                    ],
                    responses: {
                        200: {
                            description: 'Task list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                                            total: { type: 'integer' },
                                            page: { type: 'integer' },
                                            limit: { type: 'integer' },
                                            totalPages: { type: 'integer' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    summary: 'Create task',
                    tags: ['Tasks'],
                    security: [{ cookieAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['title'],
                                    properties: {
                                        title: { type: 'string' },
                                        description: { type: 'string' },
                                        status: { type: 'string', enum: ['todo', 'done'] },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Task created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Task' },
                                },
                            },
                        },
                    },
                },
            },
            '/tasks/{id}': {
                put: {
                    summary: 'Update task',
                    tags: ['Tasks'],
                    security: [{ cookieAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        title: { type: 'string' },
                                        description: { type: 'string' },
                                        status: { type: 'string', enum: ['todo', 'done'] },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Task updated',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Task' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    summary: 'Delete task',
                    tags: ['Tasks'],
                    security: [{ cookieAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: { description: 'Task deleted' },
                    },
                },
            },
            '/sessions': {
                get: {
                    summary: 'List sessions (admin/support only)',
                    tags: ['Sessions'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                    ],
                    responses: {
                        200: {
                            description: 'Session list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            sessions: { type: 'array', items: { $ref: '#/components/schemas/SessionSummary' } },
                                            total: { type: 'integer' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    summary: 'Create session',
                    tags: ['Sessions'],
                    security: [{ cookieAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        url: { type: 'string' },
                                        userAgent: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Session created',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: { sessionId: { type: 'string' } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/sessions/{id}/events': {
                get: {
                    summary: 'Get session events',
                    tags: ['Sessions'],
                    security: [{ cookieAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: {
                            description: 'Events list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: { events: { type: 'array' } },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    summary: 'Post session events',
                    tags: ['Sessions'],
                    security: [{ cookieAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['events'],
                                    properties: {
                                        events: { type: 'array' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Events received',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            ok: { type: 'boolean' },
                                            received: { type: 'integer' },
                                            total: { type: 'integer' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            '/users': {
                get: {
                    summary: 'List users (admin/support only)',
                    tags: ['Users'],
                    security: [{ cookieAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                        { name: 'role', in: 'query', schema: { type: 'string', enum: ['user', 'support', 'admin'] } },
                    ],
                    responses: {
                        200: { description: 'User list' },
                    },
                },
                post: {
                    summary: 'Create user (admin only)',
                    tags: ['Users'],
                    security: [{ cookieAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password', 'role'],
                                    properties: {
                                        email: { type: 'string', format: 'email' },
                                        password: { type: 'string' },
                                        role: { type: 'string', enum: ['user', 'support', 'admin'] },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'User created' },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);