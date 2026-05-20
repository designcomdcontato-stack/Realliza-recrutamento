-- Seed data for Realliza Recruitment Control

-- Channels
INSERT INTO channels (name, active, position) VALUES
('Mogiconecta', true, 0),
('Catho', true, 1),
('Indeed', true, 2),
('Infojobs', true, 3),
('Indicação', true, 4);

-- Stages
INSERT INTO stages (name, color, position) VALUES
('Novo', '#BFDBFE', 0),
('Agendamento', '#FEF3C7', 1),
('Entrevista', '#DDD6FE', 2),
('Contratação', '#BBF7D0', 3);

-- Jobs
INSERT INTO jobs (title, status) VALUES
('Vendas', 'Aberta'),
('Pós-Vendas', 'Aberta'),
('Auxiliar Administrativo', 'Aberta'),
('Limpeza', 'Aberta'),
('Segurança', 'Aberta');

-- App Users (Example)
INSERT INTO app_users (name, email, role, status) VALUES
('Admin', 'admin@realliza.com', 'admin', 'active');
