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
from film_analysis import run_analysis
import pandas as pd
import json
import csv
import io
import subprocess

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

def generate_recent_updates(repo_dir, output_json_path="static/recent_updates.json", limit=20):
    """Generate recent updates JSON from git diff."""
    print("Generating recent updates from git diff...")

    try:
        # Get the diff of the last commit for data/data.csv
        result = subprocess.run(
            ['git', 'log', '-1', '-p', '--', 'data/data.csv'],
            cwd=repo_dir,
            capture_output=True,
            text=True,
            check=True
        )
        diff_output = result.stdout

        new_lines = []
        for line in diff_output.splitlines():
            if line.startswith('+') and not line.startswith('+++'):
                content = line[1:]
                if content.startswith('id,certificate_id') or content.startswith('id,movie_name'):
                    continue
                if content.strip():
                    new_lines.append(content)

        if not new_lines:
            print("No new lines found in the last commit.")
            return

        print(f"Found {len(new_lines)} new lines.")

        # Parse CSV lines
        data_csv_path = os.path.join(repo_dir, 'data', 'data.csv')
        with open(data_csv_path, 'r') as f:
            header_line = f.readline().strip()

        header = header_line.split(',')

        csv_io = io.StringIO("\n".join(new_lines))
        reader = csv.reader(csv_io)

        new_films = []
        seen_ids = set()
        for row in reader:
            if len(row) == len(header):
                film_data = dict(zip(header, row))
                film_id = film_data.get('id')

                if film_id and film_id not in seen_ids:
                    # Clean name
                    film_data['movie_name'] = clean_name(film_data.get('movie_name', ''))
                    # Extract year
                    year = extract_year(film_data.get('cert_date'), film_data.get('cert_no'))
                    film_data['year'] = year
                    # Generate slug
                    film_data['slug'] = make_slug(film_data['movie_name'], year)
                    new_films.append(film_data)
                    seen_ids.add(film_id)

        # Sort by cert_date descending

        def get_date(x):
            try:
                return x.get('cert_date', '')
            except:
                return ''

        new_films.sort(key=get_date, reverse=True)

        recent_updates = new_films[:limit]

        os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
        with open(output_json_path, 'w') as f:
            json.dump(recent_updates, f, indent=2)

        print(f"Saved {len(recent_updates)} recent updates to {output_json_path}")

    except Exception as e:
        print(f"Error generating recent updates: {e}")

def fetch_remote_data(output_path="src/lib/data/data.csv", limit=20):
    """Fetch latest data from remote source by cloning the repo."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    repo_url = "https://github.com/diagram-chasing/censor-board-cuts.git"

    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Cloning {repo_url}...")
        try:
            # Clone with depth 2 to ensure we have at least one parent for diff if needed,
            subprocess.run(['git', 'clone', '--depth', '2', repo_url, temp_dir], check=True)

            # Copy data.csv
            source_csv = os.path.join(temp_dir, 'data', 'data.csv')
            if os.path.exists(source_csv):
                shutil.copy2(source_csv, output_path)
                print(f"Data copied to {output_path}")

                # Generate recent updates
                generate_recent_updates(temp_dir, limit=limit)

                return output_path
            else:
                print(f"data/data.csv not found in cloned repo")
                return None

        except subprocess.CalledProcessError as e:
            print(f"Git clone failed: {e}")
            return None

def main():
    """Main import pipeline."""
    import argparse

    parser = argparse.ArgumentParser(description="Import CBFC film data to D1 database")
    parser.add_argument('csv_file', nargs='?', help='CSV file path (or fetch from remote)')
    parser.add_argument('--batch-size', type=int, default=DEFAULT_BATCH_SIZE, help='Batch size')
    parser.add_argument('--db-mode', choices=['local', 'remote'], default='local', help='Database mode')
    parser.add_argument('--fetch', action='store_true', help='Fetch data from remote source')
    parser.add_argument('--limit', type=int, default=20, help='Number of recent updates to track')

    args = parser.parse_args()

    # Handle data source
    if args.fetch or not args.csv_file:
        csv_path = fetch_remote_data(limit=args.limit)
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