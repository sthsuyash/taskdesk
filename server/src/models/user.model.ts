export interface User {
    id: string;
    email: string;
    passwordSalt: string;
    passwordHash: string;
    roleId: string;
    createdAt: number;
    updatedAt: number;
}

export interface UserPayload {
    email?: string;
    passwordSalt?: string;
    passwordHash?: string;
    roleId?: string;
}
