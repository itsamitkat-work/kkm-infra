export interface PoolUser {
  hashId: string;
  name: string;
  empCode: number;
}

export interface AssignedUser extends PoolUser {
  assignedAt: Date | null;
}
