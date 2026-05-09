CREATE TABLE IF NOT EXISTS page_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page VARCHAR(50) NOT NULL,
  section VARCHAR(100) NOT NULL,
  content_key VARCHAR(100) NOT NULL,
  content_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_page_section_key (page, section, content_key)
);

-- Features page defaults
INSERT IGNORE INTO page_content (page, section, content_key, content_value) VALUES
('features','hero','title','Everything your team needs'),
('features','hero','subtitle','One platform to manage projects, collaborate with your team, and ship products faster.'),
('features','hero','badge','Features'),

-- Pricing page defaults
('pricing','hero','title','Simple, transparent pricing'),
('pricing','hero','subtitle','Start free. Upgrade when your team grows. Cancel anytime.'),

-- About page defaults
('about','hero','title','We\'re on a mission to make teams more productive'),
('about','hero','subtitle','Founded in 2022, ProjectHub was built by a team of engineers and designers who were frustrated with the complexity of existing project management tools.'),
('about','story','title','Our Story'),
('about','story','body','It started with a simple frustration. Our founding team was juggling Jira for tasks, Slack for chat, Notion for docs, and Google Calendar for scheduling. Every context switch cost time and focus.\n\nWe asked: why can\'t one tool do all of this, beautifully? So we built ProjectHub — a single workspace where teams can manage everything without the chaos.\n\nToday, over 10,000 teams across 50+ countries use ProjectHub to ship better products, faster.'),
('about','stats','teams','10k+'),
('about','stats','countries','50+'),
('about','stats','uptime','99.9%'),
('about','stats','founded','2022'),

-- Blog page defaults
('blog','hero','title','Stories, tips & updates'),
('blog','hero','subtitle','Product news, engineering deep-dives and team productivity tips.'),

-- Docs page defaults
('docs','hero','title','How can we help?'),
('docs','hero','subtitle','Search our docs or browse by category below.'),

-- Contact page defaults
('contact','hero','title','We\'d love to hear from you'),
('contact','hero','subtitle','Whether you have a question, feedback or just want to say hi — we\'re here.'),
('contact','info','email','support@projecthub.com'),
('contact','info','phone','+1 (800) 123-4567'),
('contact','info','hours_weekday','9:00 AM – 6:00 PM EST'),
('contact','info','hours_saturday','10:00 AM – 2:00 PM EST');
