export type ActivityItemType = "goal" | "habit" | "task";

export interface ActivityCounts {
  goals: number;
  habits: number;
  tasks: number;
}

export interface ActiveItem {
  id: string;
  title: string;
  type: "goal" | "task";
}
