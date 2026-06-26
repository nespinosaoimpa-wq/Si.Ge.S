-- Emergency Authorization for Chief Manager
-- Identifier: 20260427_emergency_manager_auth

INSERT INTO public.resources (name, email, role, status)
VALUES ('Nico Espinosa', 'nespinosa.oimpa@gmail.com', 'Gerente', 'active')
ON CONFLICT (email) DO UPDATE SET role = 'Gerente', status = 'active';

INSERT INTO public.authorized_users (email, role, status, notes)
VALUES ('nespinosa.oimpa@gmail.com', 'gerente', 'approved', 'Authorized by system administrator')
ON CONFLICT (email) DO UPDATE SET role = 'gerente', status = 'approved';
