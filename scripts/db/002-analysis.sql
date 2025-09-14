-- Analysis results table for statistical peer comparisons
-- Drop existing table if it exists to migrate to new schema
DROP TABLE IF EXISTS analysis_results;

CREATE TABLE analysis_results (
  film_id TEXT NOT NULL,
  language TEXT NOT NULL,
  model_type TEXT NOT NULL,
  violence_modifications INTEGER DEFAULT 0,
  violence_peer_median REAL DEFAULT 0,
  sensitive_content_modifications INTEGER DEFAULT 0,
  sensitive_content_peer_median REAL DEFAULT 0,
  political_religious_modifications INTEGER DEFAULT 0,
  political_religious_peer_median REAL DEFAULT 0,
  disclaimers_added INTEGER DEFAULT 0,
  disclaimers_peer_median REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (film_id, language),
  FOREIGN KEY (film_id) REFERENCES films(id) ON DELETE CASCADE
);

-- Indexes for fast lookups and filtering
CREATE INDEX IF NOT EXISTS idx_analysis_violence_score ON analysis_results(violence_modifications DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_sensitive_score ON analysis_results(sensitive_content_modifications DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_model_type ON analysis_results(model_type);
CREATE INDEX IF NOT EXISTS idx_analysis_language ON analysis_results(language);
CREATE INDEX IF NOT EXISTS idx_analysis_film_language ON analysis_results(film_id, language);