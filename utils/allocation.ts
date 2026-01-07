
import { Unit, CalculationResult, AllocationRow } from '../types';

export const calculateAllocation = (units: Unit[], totalLimit: number): CalculationResult => {
  const totalSignup = units.reduce((sum, u) => sum + u.count, 0);
  
  // If no registrations or no limit, return early
  if (totalSignup === 0 || totalLimit <= 0) {
    return {
      data: units.map(u => ({
        ...u,
        exactShare: 0,
        baseAllocated: 0,
        remainder: 0,
        allocated: 0,
        reduction: u.count,
      })),
      totalSignup,
      totalAllocated: 0,
      excess: totalSignup,
      isOver: totalSignup > 0,
    };
  }

  // Case where registration is within limit
  if (totalSignup <= totalLimit) {
    return {
      data: units.map(u => ({
        ...u,
        exactShare: u.count,
        baseAllocated: u.count,
        remainder: 0,
        allocated: u.count,
        reduction: 0,
      })),
      totalSignup,
      totalAllocated: totalSignup,
      excess: 0,
      isOver: false,
    };
  }

  // Step 1: Calculate basic quota (Floor)
  let currentAllocatedTotal = 0;
  const processedUnits: AllocationRow[] = units.map(u => {
    const exactShare = u.count * (totalLimit / totalSignup);
    const baseAllocated = Math.floor(exactShare);
    const remainder = exactShare - baseAllocated;
    currentAllocatedTotal += baseAllocated;
    
    return {
      ...u,
      exactShare,
      baseAllocated,
      remainder,
      allocated: baseAllocated,
      reduction: 0, // placeholder
    };
  });

  // Step 2: Distribute remaining spots using the Largest Remainder
  let remainingSpots = totalLimit - currentAllocatedTotal;
  
  // Sort by remainder descending
  const sortedByRemainder = [...processedUnits].sort((a, b) => b.remainder - a.remainder);
  
  // Distribute 1 by 1
  for (let i = 0; i < remainingSpots; i++) {
    const targetUnitId = sortedByRemainder[i].id;
    const index = processedUnits.findIndex(u => u.id === targetUnitId);
    if (index !== -1) {
      processedUnits[index].allocated += 1;
    }
  }

  // Finalize reduction counts
  const finalData = processedUnits.map(u => ({
    ...u,
    reduction: u.count - u.allocated,
  }));

  return {
    data: finalData,
    totalSignup,
    totalAllocated: totalLimit,
    excess: totalSignup - totalLimit,
    isOver: true,
  };
};
