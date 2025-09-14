-- COMPREHENSIVE DATABASE NORMALIZATION FOR CBFC-WATCH
-- This script normalizes all pipe-separated fields into proper relational tables
-- Run this as a migration to fix the browse functionality

-- ============================================================================
-- 1. FILM METADATA NORMALIZATION (IMDB Data)
-- ============================================================================

-- Actors normalization
CREATE TABLE IF NOT EXISTS film_actors (
    film_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_slug TEXT NOT NULL,
    position INTEGER,  -- Order in credits
    PRIMARY KEY (film_id, actor_slug),
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
);

-- Directors normalization  
CREATE TABLE IF NOT EXISTS film_directors (
    film_id TEXT NOT NULL,
    director_name TEXT NOT NULL,
    director_slug TEXT NOT NULL,
    position INTEGER,  -- For co-directors
    PRIMARY KEY (film_id, director_slug),
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
);

-- Genres normalization
CREATE TABLE IF NOT EXISTS film_genres (
    film_id TEXT NOT NULL,
    genre_name TEXT NOT NULL,
    genre_slug TEXT NOT NULL,
    PRIMARY KEY (film_id, genre_slug),
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
);

-- Countries normalization
CREATE TABLE IF NOT EXISTS film_countries (
    film_id TEXT NOT NULL,
    country_name TEXT NOT NULL,
    country_slug TEXT NOT NULL,
    PRIMARY KEY (film_id, country_slug),
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
);

-- Languages normalization
CREATE TABLE IF NOT EXISTS film_languages (
    film_id TEXT NOT NULL,
    language_name TEXT NOT NULL,
    language_slug TEXT NOT NULL,
    PRIMARY KEY (film_id, language_slug),
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
);

-- Studios normalization
CREATE TABLE IF NOT EXISTS film_studios (
    film_id TEXT NOT NULL,
    studio_name TEXT NOT NULL,
    studio_slug TEXT NOT NULL,
    PRIMARY KEY (film_id, studio_slug),
    FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. AI MODIFICATION CATEGORIES NORMALIZATION
-- ============================================================================

-- Action types (deletion, insertion, etc.)
CREATE TABLE IF NOT EXISTS modification_action_types (
    modification_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    action_slug TEXT NOT NULL,
    PRIMARY KEY (modification_id, action_type),
    FOREIGN KEY (modification_id) REFERENCES modifications(id) ON DELETE CASCADE
);

-- Content types (violence, profanity, etc.) 
CREATE TABLE IF NOT EXISTS modification_content_types (
    modification_id INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    content_slug TEXT NOT NULL,
    PRIMARY KEY (modification_id, content_type),
    FOREIGN KEY (modification_id) REFERENCES modifications(id) ON DELETE CASCADE
);

-- Media elements (visual_scene, text_dialogue, etc.)
CREATE TABLE IF NOT EXISTS modification_media_elements (
    modification_id INTEGER NOT NULL,
    media_element TEXT NOT NULL,
    media_slug TEXT NOT NULL,
    PRIMARY KEY (modification_id, media_element),
    FOREIGN KEY (modification_id) REFERENCES modifications(id) ON DELETE CASCADE
);

-- References (specific words, concepts mentioned)
CREATE TABLE IF NOT EXISTS modification_references (
    modification_id INTEGER NOT NULL,
    reference_text TEXT NOT NULL,
    reference_slug TEXT NOT NULL,
    PRIMARY KEY (modification_id, reference_slug),
    FOREIGN KEY (modification_id) REFERENCES modifications(id) ON DELETE CASCADE
);

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Film metadata indexes
CREATE INDEX IF NOT EXISTS idx_film_actors_slug ON film_actors(actor_slug);
CREATE INDEX IF NOT EXISTS idx_film_directors_slug ON film_directors(director_slug);
CREATE INDEX IF NOT EXISTS idx_film_genres_slug ON film_genres(genre_slug);
CREATE INDEX IF NOT EXISTS idx_film_countries_slug ON film_countries(country_slug);
CREATE INDEX IF NOT EXISTS idx_film_languages_slug ON film_languages(language_slug);
CREATE INDEX IF NOT EXISTS idx_film_studios_slug ON film_studios(studio_slug);

-- AI categories indexes  
CREATE INDEX IF NOT EXISTS idx_mod_action_types_slug ON modification_action_types(action_slug);
CREATE INDEX IF NOT EXISTS idx_mod_content_types_slug ON modification_content_types(content_slug);
CREATE INDEX IF NOT EXISTS idx_mod_media_elements_slug ON modification_media_elements(media_slug);
CREATE INDEX IF NOT EXISTS idx_mod_references_slug ON modification_references(reference_slug);

-- Reverse lookup indexes (for film detail pages)
CREATE INDEX IF NOT EXISTS idx_film_actors_film_id ON film_actors(film_id);
CREATE INDEX IF NOT EXISTS idx_film_directors_film_id ON film_directors(film_id);
CREATE INDEX IF NOT EXISTS idx_film_genres_film_id ON film_genres(film_id);

-- ============================================================================
-- 4. DATA POPULATION FUNCTIONS
-- ============================================================================

-- Helper function to create clean slugs
-- Note: This will be implemented in the migration script as we can't create functions in SQLite

-- ============================================================================
-- 5. MIGRATION DATA POPULATION
-- ============================================================================

-- Populate actors (split pipe-separated values)
INSERT OR IGNORE INTO film_actors (film_id, actor_name, actor_slug, position)
WITH RECURSIVE split_actors AS (
    -- Base case: films with actors
    SELECT 
        id as film_id,
        imdb_actors,
        '' as actor_name,
        imdb_actors as remaining,
        0 as position
    FROM films 
    WHERE imdb_actors IS NOT NULL AND imdb_actors != ''
    
    UNION ALL
    
    -- Recursive case: split on '|'
    SELECT 
        film_id,
        imdb_actors,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN TRIM(substr(remaining, 1, instr(remaining, '|') - 1))
            ELSE TRIM(remaining)
        END as actor_name,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN substr(remaining, instr(remaining, '|') + 1)
            ELSE ''
        END as remaining,
        position + 1
    FROM split_actors
    WHERE remaining != ''
)
SELECT DISTINCT
    film_id,
    actor_name,
    LOWER(REPLACE(REPLACE(actor_name, ' ', '-'), '''', '')) as actor_slug,
    position
FROM split_actors 
WHERE actor_name != '' AND actor_name IS NOT NULL;

-- Populate directors
INSERT OR IGNORE INTO film_directors (film_id, director_name, director_slug, position)
WITH RECURSIVE split_directors AS (
    SELECT 
        id as film_id,
        imdb_directors,
        '' as director_name,
        imdb_directors as remaining,
        0 as position
    FROM films 
    WHERE imdb_directors IS NOT NULL AND imdb_directors != ''
    
    UNION ALL
    
    SELECT 
        film_id,
        imdb_directors,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN TRIM(substr(remaining, 1, instr(remaining, '|') - 1))
            ELSE TRIM(remaining)
        END as director_name,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN substr(remaining, instr(remaining, '|') + 1)
            ELSE ''
        END as remaining,
        position + 1
    FROM split_directors
    WHERE remaining != ''
)
SELECT DISTINCT
    film_id,
    director_name,
    LOWER(REPLACE(REPLACE(director_name, ' ', '-'), '''', '')) as director_slug,
    position
FROM split_directors 
WHERE director_name != '' AND director_name IS NOT NULL;

-- Populate genres
INSERT OR IGNORE INTO film_genres (film_id, genre_name, genre_slug)
WITH RECURSIVE split_genres AS (
    SELECT 
        id as film_id,
        imdb_genres,
        '' as genre_name,
        imdb_genres as remaining
    FROM films 
    WHERE imdb_genres IS NOT NULL AND imdb_genres != ''
    
    UNION ALL
    
    SELECT 
        film_id,
        imdb_genres,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN TRIM(substr(remaining, 1, instr(remaining, '|') - 1))
            ELSE TRIM(remaining)
        END as genre_name,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN substr(remaining, instr(remaining, '|') + 1)
            ELSE ''
        END as remaining
    FROM split_genres
    WHERE remaining != ''
)
SELECT DISTINCT
    film_id,
    genre_name,
    LOWER(REPLACE(genre_name, ' ', '-')) as genre_slug
FROM split_genres 
WHERE genre_name != '' AND genre_name IS NOT NULL;

-- Populate countries
INSERT OR IGNORE INTO film_countries (film_id, country_name, country_slug)
WITH RECURSIVE split_countries AS (
    SELECT 
        id as film_id,
        imdb_countries,
        '' as country_name,
        imdb_countries as remaining
    FROM films 
    WHERE imdb_countries IS NOT NULL AND imdb_countries != ''
    
    UNION ALL
    
    SELECT 
        film_id,
        imdb_countries,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN TRIM(substr(remaining, 1, instr(remaining, '|') - 1))
            ELSE TRIM(remaining)
        END as country_name,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN substr(remaining, instr(remaining, '|') + 1)
            ELSE ''
        END as remaining
    FROM split_countries
    WHERE remaining != ''
)
SELECT DISTINCT
    film_id,
    country_name,
    LOWER(REPLACE(country_name, ' ', '-')) as country_slug
FROM split_countries 
WHERE country_name != '' AND country_name IS NOT NULL;

-- Populate languages  
INSERT OR IGNORE INTO film_languages (film_id, language_name, language_slug)
WITH RECURSIVE split_languages AS (
    SELECT 
        id as film_id,
        imdb_languages,
        '' as language_name,
        imdb_languages as remaining
    FROM films 
    WHERE imdb_languages IS NOT NULL AND imdb_languages != ''
    
    UNION ALL
    
    SELECT 
        film_id,
        imdb_languages,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN TRIM(substr(remaining, 1, instr(remaining, '|') - 1))
            ELSE TRIM(remaining)
        END as language_name,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN substr(remaining, instr(remaining, '|') + 1)
            ELSE ''
        END as remaining
    FROM split_languages
    WHERE remaining != ''
)
SELECT DISTINCT
    film_id,
    language_name,
    LOWER(REPLACE(language_name, ' ', '-')) as language_slug
FROM split_languages 
WHERE language_name != '' AND language_name IS NOT NULL;

-- Populate studios
INSERT OR IGNORE INTO film_studios (film_id, studio_name, studio_slug)
WITH RECURSIVE split_studios AS (
    SELECT 
        id as film_id,
        imdb_studios,
        '' as studio_name,
        imdb_studios as remaining
    FROM films 
    WHERE imdb_studios IS NOT NULL AND imdb_studios != ''
    
    UNION ALL
    
    SELECT 
        film_id,
        imdb_studios,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN TRIM(substr(remaining, 1, instr(remaining, '|') - 1))
            ELSE TRIM(remaining)
        END as studio_name,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN substr(remaining, instr(remaining, '|') + 1)
            ELSE ''
        END as remaining
    FROM split_studios
    WHERE remaining != ''
)
SELECT DISTINCT
    film_id,
    studio_name,
    LOWER(REPLACE(REPLACE(studio_name, ' ', '-'), '''', '')) as studio_slug
FROM split_studios 
WHERE studio_name != '' AND studio_name IS NOT NULL;

-- ============================================================================
-- 6. POPULATE AI MODIFICATION CATEGORIES  
-- ============================================================================

-- Populate content types (handles pipe-separated values like "profanity|sexual_suggestive")
INSERT OR IGNORE INTO modification_content_types (modification_id, content_type, content_slug)
WITH RECURSIVE split_content_types AS (
    SELECT 
        id as modification_id,
        ai_content_types,
        '' as content_type,
        ai_content_types as remaining
    FROM modifications 
    WHERE ai_content_types IS NOT NULL AND ai_content_types != ''
    
    UNION ALL
    
    SELECT 
        modification_id,
        ai_content_types,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN TRIM(substr(remaining, 1, instr(remaining, '|') - 1))
            ELSE TRIM(remaining)
        END as content_type,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN substr(remaining, instr(remaining, '|') + 1)
            ELSE ''
        END as remaining
    FROM split_content_types
    WHERE remaining != ''
)
SELECT DISTINCT
    modification_id,
    content_type,
    CASE content_type
        WHEN 'sexual_suggestive' THEN 'sexual-content'
        WHEN 'sexual_explicit' THEN 'explicit-sexual'
        WHEN 'substance' THEN 'substance-use'
        WHEN 'identity_reference' THEN 'identity-references'
        ELSE LOWER(REPLACE(content_type, '_', '-'))
    END as content_slug
FROM split_content_types 
WHERE content_type != '' AND content_type IS NOT NULL;

-- Populate action types (these seem to be single values, not pipe-separated)
INSERT OR IGNORE INTO modification_action_types (modification_id, action_type, action_slug)
SELECT DISTINCT
    id as modification_id,
    ai_action_types as action_type,
    CASE ai_action_types
        WHEN 'audio_modification' THEN 'audio-modification'
        WHEN 'visual_modification' THEN 'visual-modification'  
        WHEN 'text_modification' THEN 'text-modification'
        WHEN 'content_overlay' THEN 'content-overlay'
        ELSE LOWER(REPLACE(ai_action_types, '_', '-'))
    END as action_slug
FROM modifications 
WHERE ai_action_types IS NOT NULL AND ai_action_types != '';

-- Populate media elements (these seem to be single values)
INSERT OR IGNORE INTO modification_media_elements (modification_id, media_element, media_slug)
SELECT DISTINCT
    id as modification_id,
    ai_media_elements as media_element,
    CASE ai_media_elements
        WHEN 'visual_scene' THEN 'visual-scene'
        WHEN 'text_dialogue' THEN 'text-dialogue'
        ELSE LOWER(REPLACE(ai_media_elements, '_', '-'))
    END as media_slug
FROM modifications 
WHERE ai_media_elements IS NOT NULL AND ai_media_elements != '';

-- Populate references (some are pipe-separated)
INSERT OR IGNORE INTO modification_references (modification_id, reference_text, reference_slug)
WITH RECURSIVE split_references AS (
    SELECT 
        id as modification_id,
        ai_references,
        '' as reference_text,
        ai_references as remaining
    FROM modifications 
    WHERE ai_references IS NOT NULL AND ai_references != ''
    
    UNION ALL
    
    SELECT 
        modification_id,
        ai_references,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN TRIM(substr(remaining, 1, instr(remaining, '|') - 1))
            ELSE TRIM(remaining)
        END as reference_text,
        CASE 
            WHEN instr(remaining, '|') > 0 
            THEN substr(remaining, instr(remaining, '|') + 1)
            ELSE ''
        END as remaining
    FROM split_references
    WHERE remaining != ''
)
SELECT DISTINCT
    modification_id,
    reference_text,
    LOWER(REPLACE(REPLACE(REPLACE(reference_text, ' ', '-'), '''', ''), '"', '')) as reference_slug
FROM split_references 
WHERE reference_text != '' AND reference_text IS NOT NULL;

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

-- Count records in each new table
-- SELECT 'film_actors' as table_name, COUNT(*) as records FROM film_actors
-- UNION ALL SELECT 'film_directors', COUNT(*) FROM film_directors  
-- UNION ALL SELECT 'film_genres', COUNT(*) FROM film_genres
-- UNION ALL SELECT 'film_countries', COUNT(*) FROM film_countries
-- UNION ALL SELECT 'film_languages', COUNT(*) FROM film_languages
-- UNION ALL SELECT 'film_studios', COUNT(*) FROM film_studios
-- UNION ALL SELECT 'modification_content_types', COUNT(*) FROM modification_content_types
-- UNION ALL SELECT 'modification_action_types', COUNT(*) FROM modification_action_types
-- UNION ALL SELECT 'modification_media_elements', COUNT(*) FROM modification_media_elements
-- UNION ALL SELECT 'modification_references', COUNT(*) FROM modification_references;