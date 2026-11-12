// Output port: the current time. Use cases ask the clock instead of reading
// the system time, so tests can fix the date.
export interface IClock {
  now(): Date;
}
