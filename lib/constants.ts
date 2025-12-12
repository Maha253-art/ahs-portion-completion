// AHS Departments/Courses
export const DEPARTMENTS = [
  { name: 'B.Sc - Cardiac Technology', code: 'BSC-CT' },
  { name: 'B.Sc - Dialysis Technology', code: 'BSC-DT' },
  { name: 'B.Sc - Physician Assistant', code: 'BSC-PA' },
  { name: 'B.Sc - Respiratory Therapy', code: 'BSC-RT' },
  { name: 'B.Sc - Medical Record Science', code: 'BSC-MRS' },
  { name: 'B.Sc - Critical Care Technology', code: 'BSC-CCT' },
  { name: 'B.Sc - Accident and Emergency Care Technology', code: 'BSC-AECT' },
  { name: 'B.Sc - Radiology Imaging Technology', code: 'BSC-RIT' },
  { name: 'B.Sc - Operation Theatre & Anaesthesia Technology', code: 'BSC-OTAT' },
] as const;

export type DepartmentCode = typeof DEPARTMENTS[number]['code'];
export type DepartmentName = typeof DEPARTMENTS[number]['name'];
