#!/usr/bin/env python3
"""
Film Utilities - Shared functions for CBFC film data processing
"""

import csv
import re
import json
import os
import subprocess
from datetime import datetime
from collections import defaultdict
from difflib import SequenceMatcher

# Configuration
CSV_FIELD_SIZE_LIMIT = 500000
DEFAULT_BATCH_SIZE = 5000

# Set CSV field size limit
csv.field_size_limit(CSV_FIELD_SIZE_LIMIT)

def extract_year(cert_date, cert_no=None):
    """Extract year from cert_date, fallback to cert_no."""
    if cert_date:
        try:
            return datetime.strptime(cert_date, '%Y-%m-%d').year
        except (ValueError, TypeError):
            try:
                return int(cert_date.split('-')[0])
            except (ValueError, IndexError, AttributeError):
                pass

    if cert_no:
        try:
            parts = cert_no.split('-')
            if len(parts) >= 2:
                before_last_hyphen = parts[-2]
                year_match = re.search(r'(\d{4})$', before_last_hyphen)
                if year_match:
                    year = int(year_match.group(1))
                    if 1900 <= year <= 2090:
                        return year
        except (ValueError, IndexError, AttributeError):
            pass

    return None

def clean_name(name):
    """Clean movie name."""
    if not name:
        return ''
    name = str(name).strip()
    name = re.sub(r'[\.,!?;:]+$', '', name)
    name = re.sub(r'^[\.,!?;:]+', '', name)
    name = re.sub(r'^"{2,3}(.+?)"{2,3}$', r'\1', name)
    name = re.sub(r"^'(.+?)'$", r'\1', name)
    name = re.sub(r'\*+$', '', name)
    return re.sub(r'\s+', ' ', name.strip())

def make_slug(name, year):
    """Generate slug from name and year."""
    if not name:
        return "unknown"
    slug = clean_name(name).lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    return f"{slug}-{year}" if year else slug

def sql_value(value, is_number=False):
    """Format value for SQL."""
    if value is None or str(value).strip() == '':
        return "NULL"
    if is_number:
        try:
            return str(float(value)) if '.' in str(value) else str(int(value))
        except ValueError:
            return "NULL"
    return "'" + str(value).replace("'", "''") + "'"

def completeness_score(row):
    """Score row by metadata completeness."""
    score = 0
    if row.get('imdb_poster_url'): score += 10
    if row.get('imdb_overview'): score += 8
    if row.get('imdb_rating'): score += 5
    if row.get('imdb_genres'): score += 4
    if row.get('imdb_directors'): score += 4
    if row.get('imdb_actors'): score += 4
    return score

def split_delimited_values(value, delimiters=['|', ';']):
    """Split a string by multiple possible delimiters and clean the results."""
    if not isinstance(value, str):
        return []

    result = [value]
    for delimiter in delimiters:
        new_result = []
        for item in result:
            new_result.extend([part.strip() for part in item.split(delimiter)])
        result = new_result

    return [item for item in result if item]

def safe_float(value):
    """Safely convert to float."""
    try:
        return float(value) if value and str(value).strip() else 0.0
    except:
        return 0.0

def safe_int(value):
    """Safely convert to int."""
    try:
        return int(float(value)) if value and str(value).strip() else 0
    except:
        return 0

def parse_date_to_timestamp(date_str):
    """Parse date string to Unix timestamp."""
    if not date_str or not isinstance(date_str, str):
        return 0

    formats = ['%Y-%m-%d', '%d %b %Y', '%Y', '%d-%m-%Y']
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return int(dt.timestamp())
        except ValueError:
            continue
    return 0

def sanitize_name(name):
    """Clean and normalize movie name."""
    if not name:
        return ""
    name = name.strip().title()
    return re.sub(r'\s+', ' ', name)

def calculate_popularity_score(imdb_votes=None, imdb_rating=None):
    """Calculate custom popularity score."""
    import math


    try:
        votes = int(float(str(imdb_votes).replace(',', ''))) if imdb_votes else 0
    except:
        votes = 0

    vote_score = math.log10(max(votes, 1)) * 10

    try:
        rating = float(imdb_rating) if imdb_rating else 0
        rating_score = rating * 2
    except:
        rating_score = 0

    total_score = vote_score + rating_score
    return round(total_score, 2)

def load_and_group_films(csv_path):
    """Load CSV and group films by name+year. Returns (groups, stats)."""
    if not os.path.exists(csv_path):
        return {}, {}

    groups = defaultdict(list)
    language_counts = defaultdict(int)
    total_modifications = 0

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('description'):
                total_modifications += 1

            lang = row.get('language', '').strip()
            if lang:
                language_counts[lang] += 1

            name = clean_name(row.get('movie_name', ''))
            year = extract_year(row.get('cert_date'), row.get('cert_no'))
            film_id = row.get('id', '').strip()

            if name and year:
                # Group by name and year (original logic)
                groups[(name.lower(), year)].append(row)

    stats = {
        'total_films': len(groups),
        'total_modifications': total_modifications,
        'language_counts': language_counts
    }

    return groups, stats

def run_command(cmd, timeout=30):
    """Run shell command and return result."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)

def save_json(data, filepath):
    """Save data to JSON file."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving {filepath}: {e}")
        return False

def match_movies_by_name(source_movies, target_movies, threshold=0.6):
    """Match movies from two lists by name similarity."""
    matched = []

    for source in source_movies:
        source_name = source.get('name', '').upper()
        best_match = None
        best_score = 0

        for target in target_movies:
            target_name = target.get('name', '').upper()
            score = SequenceMatcher(None, source_name, target_name).ratio()

            if score > best_score and score >= threshold:
                best_score = score
                best_match = target.copy()

        if best_match:
            best_match['matchScore'] = best_score
            matched.append(best_match)

    return matched