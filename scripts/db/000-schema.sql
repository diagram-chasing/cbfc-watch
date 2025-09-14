-- Films table - core film information
CREATE TABLE IF NOT EXISTS films (
  id TEXT PRIMARY KEY,
  slug TEXT,
  name TEXT NOT NULL,
  year INTEGER,
  language TEXT,
  duration REAL,
  rating TEXT,
  cert_date TEXT,
  cert_no TEXT,
  cbfc_file_no TEXT,
  applicant TEXT,
  certifier TEXT,
  poster_url TEXT,
  imdb_id TEXT,
  imdb_rating REAL,
  imdb_votes TEXT,
  imdb_overview TEXT,
  views INTEGER DEFAULT 0,
  imdb_genres TEXT,
  imdb_directors TEXT,
  imdb_actors TEXT,
  imdb_countries TEXT,
  imdb_languages TEXT,
  imdb_studios TEXT
);

-- Film views tracking table - tracks daily views for each film
CREATE TABLE IF NOT EXISTS film_views (
  film_id TEXT NOT NULL,
  view_date TEXT NOT NULL,  -- Stored as YYYY-MM-DD
  view_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (film_id, view_date),
  FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS modifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  film_id TEXT NOT NULL,
  cut_no INTEGER,
  description TEXT,
  ai_description TEXT,
  deleted_secs REAL DEFAULT 0,
  replaced_secs REAL DEFAULT 0,
  inserted_secs REAL DEFAULT 0,
  ai_action_types TEXT,
  ai_content_types TEXT,
  ai_media_elements TEXT,
  ai_references TEXT,
  FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
);

-- Simplified Film-Category Mapping
CREATE TABLE IF NOT EXISTS film_categories (
  film_id TEXT NOT NULL,
  category_type TEXT NOT NULL,
  category_value TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  PRIMARY KEY (film_id, category_type, category_value),
  FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
);

-- Category Metadata Table - Pre-aggregated counts to avoid expensive GROUP BY operations
CREATE TABLE IF NOT EXISTS category_metadata (
  category_type TEXT NOT NULL,
  category_value TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  film_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category_type, category_value)
);

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_films_slug ON films(slug);
CREATE INDEX IF NOT EXISTS idx_films_name ON films(name);
CREATE INDEX IF NOT EXISTS idx_films_language ON films(language);
CREATE INDEX IF NOT EXISTS idx_films_year ON films(year);
CREATE INDEX IF NOT EXISTS idx_modifications_film_id ON modifications(film_id);
CREATE INDEX IF NOT EXISTS idx_film_views_date ON film_views(view_date);

CREATE INDEX IF NOT EXISTS idx_film_categories_type_slug ON film_categories(category_type, category_slug);
CREATE INDEX IF NOT EXISTS idx_category_metadata_type_count ON category_metadata(category_type, film_count DESC);
CREATE INDEX IF NOT EXISTS idx_category_metadata_slug ON category_metadata(category_slug);

CREATE VIEW IF NOT EXISTS v_categories AS
SELECT 
  category_type,
  category_value,
  category_slug,
  film_count
FROM category_metadata;

-- View optimized for film detail pages to reduce row reads
CREATE VIEW IF NOT EXISTS v_film_details AS
SELECT
  f.id,
  f.slug,
  f.name,
  f.year,
  f.duration,
  f.rating,
  f.poster_url,
  f.imdb_id,
  f.imdb_rating,
  f.imdb_votes,
  f.imdb_overview,
  f.views,
  f.language,
  f.cert_date,
  f.cbfc_file_no,
  f.certifier,
  f.imdb_genres,
  f.imdb_directors,
  f.imdb_actors,
  f.imdb_countries,
  f.imdb_languages,
  f.imdb_studios,
  json_group_array(json_object(
    'id', m.id,
    'description', m.description,
    'ai_description', m.ai_description,
    'cut_no', m.cut_no,
    'deleted_secs', m.deleted_secs,
    'replaced_secs', m.replaced_secs, 
    'inserted_secs', m.inserted_secs,
    'ai_action_types', m.ai_action_types,
    'ai_content_types', m.ai_content_types,
    'ai_media_elements', m.ai_media_elements,
    'ai_references', m.ai_references
  )) AS modifications_json
FROM
  films f
LEFT JOIN
  modifications m ON f.id = m.film_id
GROUP BY
  f.id;

-- View for browsing films by category
CREATE VIEW IF NOT EXISTS v_browse_films AS
SELECT 
  f.id, 
  f.slug, 
  f.name, 
  f.year, 
  f.language, 
  f.poster_url, 
  f.imdb_rating,
  f.rating,
  (SELECT COUNT(*) 
  FROM modifications WHERE film_id = f.id) AS modification_count,
  f.imdb_directors,
  f.imdb_actors,
  f.imdb_genres,
  f.imdb_studios,
  f.imdb_countries,
  f.imdb_languages
FROM films f;