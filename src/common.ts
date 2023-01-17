export type RPartial<T> = {
  [P in keyof T]?: T extends object ? RPartial<T[P]> : T[P];
};
