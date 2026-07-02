export interface DispatchTask {
  id: string;
  priority: number;
  etaMinutes: number;
  distanceKm: number;
}

export const rankDispatchTasks = (tasks: DispatchTask[]): DispatchTask[] => {
  return [...tasks].sort((a, b) => {
    const scoreA = a.priority * 100 - a.etaMinutes * 3 - a.distanceKm;
    const scoreB = b.priority * 100 - b.etaMinutes * 3 - b.distanceKm;
    return scoreB - scoreA;
  });
};
