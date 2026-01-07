
export interface Unit {
  id: string;
  name: string;
  count: number;
}

export interface AllocationRow extends Unit {
  exactShare: number;
  baseAllocated: number;
  remainder: number;
  allocated: number;
  reduction: number;
}

export interface CalculationResult {
  data: AllocationRow[];
  totalSignup: number;
  totalAllocated: number;
  excess: number;
  isOver: boolean;
}

export interface DrawResult {
  winners: string[];
  waitlist: string[];
}

export interface SavedRecord {
  id: string;
  title: string;
  timestamp: number;
  totalLimit: number;
  units: Unit[];
}
