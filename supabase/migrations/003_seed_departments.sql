-- Seed AHS Departments/Courses
INSERT INTO departments (name, code) VALUES
    ('B.Sc - Cardiac Technology', 'BSC-CT'),
    ('B.Sc - Dialysis Technology', 'BSC-DT'),
    ('B.Sc - Physician Assistant', 'BSC-PA'),
    ('B.Sc - Respiratory Therapy', 'BSC-RT'),
    ('B.Sc - Medical Record Science', 'BSC-MRS'),
    ('B.Sc - Critical Care Technology', 'BSC-CCT'),
    ('B.Sc - Accident and Emergency Care Technology', 'BSC-AECT'),
    ('B.Sc - Radiology Imaging Technology', 'BSC-RIT'),
    ('B.Sc - Operation Theatre & Anaesthesia Technology', 'BSC-OTAT')
ON CONFLICT (code) DO NOTHING;
