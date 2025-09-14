#!/usr/bin/env python3
"""
Data Import - Complete pipeline for importing CBFC film data
Combines CSV processing and D1 database import functionality
"""

import sys
import os
import tempfile
import shutil
from pathlib import Path
# Add scripts directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from film_utils import *
from film_analysis import run_analysis
import pandas as pd

def generate_sql_batches(csv_path, output_dir, batch_size=DEFAULT_BATCH_SIZE):
    """Generate SQL batch files from CSV data."""
    groups, _ = load_and_group_films(csv_path)
    if not groups:
        print(f"No film data found in {csv_path}")
        return []

    os.makedirs(output_dir, exist_ok=True)

    batch_files = []
    current_batch = 1
    rows_written = 0
    used_slugs = set()

    batch_file = os.path.join(output_dir, f"tmp_import_batch_{current_batch}.sql")
    sqlfile = open(batch_file, 'w', encoding='utf-8')
    batch_files.append(batch_file)

    for group_key, film_rows in groups.items():
        # Handle both old format (name, year) and new format (name, year, film_id)
        if len(group_key) == 3:
            name_key, year, film_id = group_key
        else:
            name_key, year = group_key
            film_id = None
        best_row = max(film_rows, key=completeness_score)

        # Generate unique slug
        base_slug = make_slug(best_row.get('movie_name', ''), year)
        
        # If this is a film with multiple versions (different film IDs), 
        # append the last 3 digits of film ID to make it unique
        if len(group_key) == 3 and film_id:
            # Check if there are other films with same name/year but different IDs
            name_year_key = (group_key[0], group_key[1])  # (name, year)
            similar_films = [k for k in groups.keys() if len(k) == 3 and (k[0], k[1]) == name_year_key]
            
            if len(similar_films) > 1:
                # Multiple films with same name/year - append film ID suffix
                id_suffix = film_id[-3:] if len(film_id) >= 3 else film_id
                base_slug = f"{base_slug}-{id_suffix}"
        
        slug = base_slug
        counter = 1
        while slug in used_slugs:
            slug = f"{base_slug}-{counter}"
            counter += 1
        used_slugs.add(slug)

        # Insert separate film record for each language version
        for row in film_rows:
            if rows_written >= batch_size:
                sqlfile.close()
                current_batch += 1
                batch_file = os.path.join(output_dir, f"tmp_import_batch_{current_batch}.sql")
                sqlfile = open(batch_file, 'w', encoding='utf-8')
                batch_files.append(batch_file)
                rows_written = 0

            # Film record
            film_id = sql_value(row.get(list(row.keys())[0]))
            name = sql_value(clean_name(best_row.get('movie_name', '')))
            language = sql_value(row.get('language'))
            cert_date = sql_value(row.get('cert_date'))
            cert_no = sql_value(row.get('cert_no'))
            cbfc_file_no = sql_value(row.get('cbfc_file_no'))
            applicant = sql_value(row.get('applicant'))
            certifier = sql_value(row.get('certifier'))

            duration = sql_value(float(row.get('duration_secs', 0)) / 60.0 if row.get('duration_secs') else None, True)
            rating = sql_value(row.get('rating'))
            poster_url = sql_value(best_row.get('imdb_poster_url'))
            imdb_id = sql_value(best_row.get('imdb_id'))
            imdb_rating = sql_value(best_row.get('imdb_rating'), True)
            imdb_votes = sql_value(best_row.get('imdb_votes'))
            overview = sql_value(best_row.get('imdb_overview'))
            imdb_genres = sql_value(best_row.get('imdb_genres'))
            imdb_directors = sql_value(best_row.get('imdb_directors'))
            imdb_actors = sql_value(best_row.get('imdb_actors'))
            imdb_countries = sql_value(best_row.get('imdb_countries'))
            imdb_languages = sql_value(best_row.get('imdb_languages'))
            imdb_studios = sql_value(best_row.get('imdb_studios'))

            sqlfile.write(f"""INSERT OR IGNORE INTO films (id, slug, name, year, language, duration, rating, cert_date, cert_no, cbfc_file_no, applicant, certifier, poster_url, imdb_id, imdb_rating, imdb_votes, imdb_overview, imdb_genres, imdb_directors, imdb_actors, imdb_countries, imdb_languages, imdb_studios)
VALUES ({film_id}, {sql_value(slug)}, {name}, {sql_value(year, True)}, {language}, {duration}, {rating}, {cert_date}, {cert_no}, {cbfc_file_no}, {applicant}, {certifier}, {poster_url}, {imdb_id}, {imdb_rating}, {imdb_votes}, {overview}, {imdb_genres}, {imdb_directors}, {imdb_actors}, {imdb_countries}, {imdb_languages}, {imdb_studios});
""")

            # Insert modification if exists
            if row.get('description'):
                cut_no = sql_value(row.get('cut_no'), True)
                description = sql_value(row.get('description'))
                ai_desc = sql_value(row.get('ai_cleaned_description'))
                deleted_secs = sql_value(row.get('deleted_secs'), True)
                replaced_secs = sql_value(row.get('replaced_secs'), True)
                inserted_secs = sql_value(row.get('inserted_secs'), True)
                ai_action_types = sql_value(row.get('ai_action'))
                ai_content_types = sql_value(row.get('ai_content_types'))
                ai_media_elements = sql_value(row.get('ai_media_element'))
                ai_references = sql_value(row.get('ai_reference'))

                sqlfile.write(f"""INSERT OR IGNORE INTO modifications (film_id, cut_no, description, ai_description, deleted_secs, replaced_secs, inserted_secs, ai_action_types, ai_content_types, ai_media_elements, ai_references)
VALUES ({film_id}, {cut_no}, {description}, {ai_desc}, {deleted_secs}, {replaced_secs}, {inserted_secs}, {ai_action_types}, {ai_content_types}, {ai_media_elements}, {ai_references});
""")

            rows_written += 1

    sqlfile.close()

    # Create indexes file
    index_file = os.path.join(output_dir, "tmp_import_final_indexes.sql")
    with open(index_file, 'w', encoding='utf-8') as f:
        f.write("""CREATE INDEX IF NOT EXISTS idx_films_slug ON films(slug);
CREATE INDEX IF NOT EXISTS idx_films_year ON films(year);
CREATE INDEX IF NOT EXISTS idx_modifications_film_id ON modifications(film_id);
ANALYZE;
""")
    batch_files.append(index_file)

    return batch_files

def generate_analysis_sql(analysis_csv_path, output_dir):
    """Generate SQL for analysis results from the analysis CSV."""
    if not os.path.exists(analysis_csv_path):
        print(f"Analysis CSV not found: {analysis_csv_path}")
        return None
    
    df = pd.read_csv(analysis_csv_path)
    analysis_file = os.path.join(output_dir, "tmp_analysis_import.sql")
    
    with open(analysis_file, 'w', encoding='utf-8') as f:
        for _, row in df.iterrows():
            film_id = sql_value(row['id'])
            language = sql_value(row['language'])
            model_type = sql_value(row['model_type'])
            violence_mods = sql_value(row['score_value_violence_modifications'], True)
            violence_median = sql_value(row['median_score_violence_modifications'], True)
            sensitive_mods = sql_value(row['score_value_sensitive_content_modifications'], True)
            sensitive_median = sql_value(row['median_score_sensitive_content_modifications'], True)
            pol_rel_mods = sql_value(row['score_value_political_religious_modifications'], True)
            pol_rel_median = sql_value(row['median_score_political_religious_modifications'], True)
            disclaimers = sql_value(row['score_value_disclaimers_added'], True)
            disclaimers_median = sql_value(row['median_score_disclaimers_added'], True)
            
            f.write(f"""INSERT OR REPLACE INTO analysis_results (film_id, language, model_type, violence_modifications, violence_peer_median, sensitive_content_modifications, sensitive_content_peer_median, political_religious_modifications, political_religious_peer_median, disclaimers_added, disclaimers_peer_median)
VALUES ({film_id}, {language}, {model_type}, {violence_mods}, {violence_median}, {sensitive_mods}, {sensitive_median}, {pol_rel_mods}, {pol_rel_median}, {disclaimers}, {disclaimers_median});
""")
    
    return analysis_file

def import_to_d1(batch_files, db_mode='local', db_name=None):
    """Import SQL batches to D1 database."""
    if not db_name:
        # Read database name from wrangler.toml
        wrangler_toml = Path.cwd() / "wrangler.toml"
        if wrangler_toml.exists():
            with open(wrangler_toml) as f:
                for line in f:
                    if 'database_name' in line:
                        db_name = line.split('"')[1] if '"' in line else line.split("'")[1]
                        break

        if not db_name:
            print("Error: Could not find database_name in wrangler.toml")
            return False

    wrangler_flag = "--local" if db_mode == "local" else "--remote"
    print(f"Importing to {db_mode} database: {db_name}")

    # Apply schemas if they exist
    schema_files = sorted(Path.cwd().glob("scripts/db/*.sql"))
    for schema_file in schema_files:
        if schema_file.name.startswith('000-') or schema_file.name.startswith('002-'):
            print(f"Applying {schema_file.name}...")
            success, _, stderr = run_command([
                'npx', 'wrangler', 'd1', 'execute', db_name, wrangler_flag,
                f'--file={schema_file}', '-y'
            ])
            if not success:
                print(f"Schema application failed for {schema_file.name}: {stderr}")

    # Import batches
    data_files = [f for f in batch_files if 'final_indexes' not in f]
    index_file = next((f for f in batch_files if 'final_indexes' in f), None)

    for i, batch_file in enumerate(data_files, 1):
        print(f"Importing batch {i}/{len(data_files)}: {os.path.basename(batch_file)}")

        success, _, stderr = run_command([
            'npx', 'wrangler', 'd1', 'execute', db_name, wrangler_flag,
            f'--file={batch_file}', '-y'
        ], timeout=300)

        if not success:
            print(f"Batch {i} failed: {stderr}")
        else:
            os.remove(batch_file)  # Clean up successful imports

    # Apply indexes
    if index_file:
        print("Creating indexes...")
        success, _, stderr = run_command([
            'npx', 'wrangler', 'd1', 'execute', db_name, wrangler_flag,
            f'--file={index_file}', '-y'
        ])
        if success:
            os.remove(index_file)
        else:
            print(f"Index creation failed: {stderr}")

    # Verify import
    print("Verifying import...")
    success, stdout, _ = run_command([
        'npx', 'wrangler', 'd1', 'execute', db_name, wrangler_flag,
        '--command', 'SELECT COUNT(*) FROM films;', '-y'
    ])
    if success:
        print(f"Import verified: {stdout.strip()}")

    return True

def fetch_remote_data(output_path="src/lib/data/data.csv"):
    """Fetch latest data from remote source."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    url = "https://github.com/diagram-chasing/censor-board-cuts/raw/refs/heads/master/data/data.csv"
    print(f"Downloading data from {url}")

    success, _, stderr = run_command(['curl', '-L', url, '-o', output_path])
    if success and os.path.exists(output_path):
        print(f"Data downloaded to {output_path}")
        return output_path
    else:
        print(f"Download failed: {stderr}")
        return None

def main():
    """Main import pipeline."""
    import argparse

    parser = argparse.ArgumentParser(description="Import CBFC film data to D1 database")
    parser.add_argument('csv_file', nargs='?', help='CSV file path (or fetch from remote)')
    parser.add_argument('--batch-size', type=int, default=DEFAULT_BATCH_SIZE, help='Batch size')
    parser.add_argument('--db-mode', choices=['local', 'remote'], default='local', help='Database mode')
    parser.add_argument('--fetch', action='store_true', help='Fetch data from remote source')

    args = parser.parse_args()

    # Handle data source
    if args.fetch or not args.csv_file:
        csv_path = fetch_remote_data()
        if not csv_path:
            sys.exit(1)
    else:
        csv_path = args.csv_file
        if not os.path.exists(csv_path):
            print(f"CSV file not found: {csv_path}")
            sys.exit(1)

    # Generate SQL batches
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Processing {csv_path} (batch size: {args.batch_size})")
        batch_files = generate_sql_batches(csv_path, temp_dir, args.batch_size)

        if not batch_files:
            print("No SQL batches generated")
            sys.exit(1)

        # Run analysis and generate analysis SQL
        print("Running statistical analysis...")
        analysis_csv = os.path.join(temp_dir, "analysis_results.csv")
        run_analysis(csv_path, analysis_csv)
        
        analysis_sql = generate_analysis_sql(analysis_csv, temp_dir)
        if analysis_sql:
            batch_files.append(analysis_sql)

        # Import to database
        success = import_to_d1(batch_files, args.db_mode)
        if not success:
            sys.exit(1)

    print("Data import completed successfully!")

if __name__ == '__main__':
    main()