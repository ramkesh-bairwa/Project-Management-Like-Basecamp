-- SQL equivalent of the schema change in database/migrations/add_blog_slug.js
ALTER TABLE blogs ADD COLUMN slug VARCHAR(320) UNIQUE AFTER title;
