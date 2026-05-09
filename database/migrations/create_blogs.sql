CREATE TABLE IF NOT EXISTS blogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  excerpt TEXT,
  content LONGTEXT,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  author VARCHAR(150) NOT NULL,
  author_color VARCHAR(20) DEFAULT '#457b9d',
  cover_color VARCHAR(20) DEFAULT '#1d3557',
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO blogs (title, excerpt, category, author, author_color, cover_color) VALUES
('Introducing ProjectHub 2.0: A New Era of Team Collaboration', 'We rebuilt ProjectHub from the ground up with speed, simplicity and real-time collaboration at its core. Here is what is new.', 'Product', 'Ramkesh Bairwa', '#e63946', '#1d3557'),
('How We Scaled Our WebSocket Server to 100k Connections', 'A deep dive into the architecture decisions that allowed us to handle massive concurrent connections without breaking a sweat.', 'Engineering', 'Ramkesh Bairwa', '#e63946', '#2a4a73'),
('10 Task Management Tips That Will Transform Your Team', 'Stop drowning in to-do lists. These proven strategies will help your team stay focused, ship faster and stress less.', 'Tips & Tricks', 'Ramkesh Bairwa', '#e63946', '#2a9d8f'),
('From 0 to 10,000 Users: Our Growth Story', 'We grew ProjectHub from a side project to a product used by thousands of teams. Here is exactly how we did it.', 'Growth', 'Ramkesh Bairwa', '#e63946', '#457b9d'),
('How DesignCo Cut Project Delays by 60% with ProjectHub', 'DesignCo was missing deadlines every quarter. After switching to ProjectHub, their on-time delivery rate jumped dramatically.', 'Customer Stories', 'Ramkesh Bairwa', '#e63946', '#6d6875'),
('Building a Real-Time Notification System with Next.js', 'Notifications that actually arrive instantly. We walk through our full implementation using WebSockets and server-sent events.', 'Engineering', 'Ramkesh Bairwa', '#e63946', '#1d3557'),
('5 Ways to Run Better Sprint Reviews', 'Sprint reviews do not have to be boring status updates. Here are five techniques to make them energising and productive.', 'Tips & Tricks', 'Ramkesh Bairwa', '#e63946', '#f4a261'),
('ProjectHub Now Supports Custom Roles and Permissions', 'Enterprise teams asked, we delivered. Custom roles let you define exactly who can see and do what inside your workspace.', 'Product', 'Ramkesh Bairwa', '#e63946', '#a8dadc'),
('Why We Chose MySQL Over PostgreSQL for Our Core Database', 'A candid look at the trade-offs we evaluated and why MySQL ended up being the right choice for our workload.', 'Engineering', 'Ramkesh Bairwa', '#e63946', '#2a4a73'),
('The Remote Team Playbook: Staying Aligned Across Time Zones', 'Async-first communication, smart meeting cadences and the tools that keep distributed teams moving as one.', 'Growth', 'Ramkesh Bairwa', '#e63946', '#457b9d'),
('AgencyFlow Doubled Client Retention Using ProjectHub', 'Client projects were slipping through the cracks. ProjectHub gave AgencyFlow full visibility and their clients loved it.', 'Customer Stories', 'Ramkesh Bairwa', '#e63946', '#6d6875'),
('Keyboard Shortcuts and Power Features You Are Missing', 'Most users only scratch the surface of ProjectHub. These hidden features will save you hours every week.', 'Tips & Tricks', 'Ramkesh Bairwa', '#e63946', '#2a9d8f');
