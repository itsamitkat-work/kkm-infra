export type AppSubject =
  | 'Schedule'
  | 'BasicRate'
  | 'Attendance'
  | 'ResourcePool'
  | 'Project'
  | 'AssignedProject'
  | 'ProjectMeasurement'
  | 'ProjectBilling';

export type AppAction =
  | 'read'
  | 'manage'
  | 'check'
  | 'verify'
  | 'lock'
  | 'update'
  | 'delete'
  | 'create';
