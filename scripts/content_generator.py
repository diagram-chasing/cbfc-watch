#!/usr/bin/env python3
"""
Content Generator - Generate JSON files for web application
Combines output generation and external API integration
"""

import sys
import os
import json

# Add scripts directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from film_utils import *

# Configuration
STATIC_DIR = "static"


def recalculate_proportional_popularity_movies(movies):
    """Recalculate popularity scores to ensure proportional language representation."""
    # Define the proportional representation for every 17 films
    language_proportions = {
        'english': 4, 
        'hindi': 4,
        'tamil': 2,
        'telugu': 2,
        'kannada': 2,
        'malayalam': 2,
        'other': 1
    }
    
    # Classify languages into categories
    def classify_language(language):
        if not language:
            return 'other'
        
        # Take the primary language
        primary_lang = language[0].lower().rstrip()
        
        if primary_lang in ['english']:
            return 'english'
        elif primary_lang in ['hindi']:
            return 'hindi'
        elif primary_lang in ['tamil']:
            return 'tamil'
        elif primary_lang in ['telugu']:
            return 'telugu'
        elif primary_lang in ['kannada']:
            return 'kannada'
        elif primary_lang in ['malayalam']:
            return 'malayalam'
        else:
            return 'other'
    
    # Group movies by language category and sort by original popularity
    language_groups = {}
    for movie in movies:
        lang_category = classify_language(movie['imdbLanguages'])
        if lang_category not in language_groups:
            language_groups[lang_category] = []
        language_groups[lang_category].append(movie)
    
    # Sort each language group by original popularity (descending)
    for lang_category in language_groups:
        language_groups[lang_category].sort(key=lambda x: x['popularityScore'], reverse=True)
    
    # Recalculate popularity scores with proportional representation
    total_films = len(movies)
    current_popularity = total_films  # Start from highest score
    
    # Process in groups of 17
    group_size = 17
    processed_count = 0
    
    while processed_count < total_films:
        # Determine how many films to process in this group
        remaining_films = total_films - processed_count
        current_group_size = min(group_size, remaining_films)
        
        # Calculate proportional allocation for this group
        group_allocations = {}
        total_allocated = 0
        
        for lang, proportion in language_proportions.items():
            if lang in language_groups and language_groups[lang]:
                # Scale proportion based on current group size
                allocated = min(
                    int(proportion * current_group_size / group_size),
                    len(language_groups[lang]),  # Don't allocate more than available
                    current_group_size - total_allocated  # Don't exceed group size
                )
                group_allocations[lang] = allocated
                total_allocated += allocated
        
        # Fill remaining slots with available films
        remaining_slots = current_group_size - total_allocated
        for lang in language_groups:
            if remaining_slots <= 0:
                break
            if lang not in group_allocations:
                group_allocations[lang] = 0
            
            available = len(language_groups[lang])
            additional = min(remaining_slots, available - group_allocations[lang])
            if additional > 0:
                group_allocations[lang] += additional
                remaining_slots -= additional

        
        # Assign popularity scores for this group
        for lang, allocation in group_allocations.items():
            for i in range(allocation):
                if language_groups[lang]:
                    movie = language_groups[lang].pop(0)
                    movie['popularityScore'] = current_popularity
                    current_popularity -= 1
                    processed_count += 1
                    
    return movies

def generate_current_movies(csv_file):
    """Generate curated current movies using proportional popularity scoring."""
    print("Generating current movies selection...")

    groups, _ = load_and_group_films(csv_file)
    if not groups:
        return []

    # Convert to search-friendly format with scores
    movies_with_scores = []
    used_slugs = set()

    for (name_key, year), film_rows in groups.items():
        best_row = max(film_rows, key=completeness_score)

        # Generate unique slug
        base_slug = make_slug(best_row.get('movie_name', ''), year)
        slug = base_slug
        counter = 1
        while slug in used_slugs:
            slug = f"{base_slug}-{counter}"
            counter += 1
        used_slugs.add(slug)

        # Collect languages and AI tags
        languages = set()
        ai_actions = set()
        ai_content_types = set()
        ai_media_elements = set()

        for row in film_rows:
            if row.get('language'):
                languages.add(row['language'].strip())
            if row.get('ai_action'):
                ai_actions.update(split_delimited_values(row['ai_action']))
            if row.get('ai_content_types'):
                ai_content_types.update(split_delimited_values(row['ai_content_types']))
            if row.get('ai_media_element'):
                ai_media_elements.update(split_delimited_values(row['ai_media_element']))

        modification_count = sum(1 for row in film_rows if row.get('description'))
        
        # Calculate initial popularity score
        score = calculate_popularity_score(
            imdb_votes=safe_int(best_row.get('imdb_votes', 0)),
            imdb_rating=best_row.get('imdb_rating')
        )

        movie = {
            "id": best_row.get('id'),
            "slug": slug,
            "name": clean_name(best_row.get('movie_name', '')),
            "language": best_row.get('language', '').strip(),
            "year": year,
            "posterUrl": best_row.get('imdb_poster_url', ''),
            "rating": best_row.get('rating', ''),
            "certDate": best_row.get('cert_date', ''),
            "imdbRating": safe_float(best_row.get('imdb_rating')),
            "imdbLanguages": split_delimited_values(best_row.get('imdb_languages', '')),
            "modificationCount": modification_count,
            "views": None,
            "aiActionTypes": sorted(list(ai_actions)),
            "aiContentTypes": sorted(list(ai_content_types)),
            "aiMediaElements": sorted(list(ai_media_elements)),
            "imdbGenres": split_delimited_values(best_row.get('imdb_genres', '')),
            "popularityScore": score
        }
        movies_with_scores.append(movie)

    # Recalculate popularity scores for proportional language representation
    print("Recalculating popularity scores for proportional language representation...")
    movies_with_scores = recalculate_proportional_popularity_movies(movies_with_scores)
    
    # Sort by new popularity scores and return top 500
    movies_with_scores.sort(key=lambda x: x.get('popularityScore', 0), reverse=True)
    
    print(f"Selected top 500 movies from {len(movies_with_scores)} total")
    return movies_with_scores[:500]

def generate_summary_stats(csv_file):
    """Generate summary statistics."""
    _, stats = load_and_group_films(csv_file)
    if not stats:
        return {"allCounts": {"all": 0, "modifications": 0}, "topLanguages": [], "lastUpdated": datetime.now().strftime("%Y-%m-%d")}

    top_languages = sorted(stats['language_counts'].items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "allCounts": {
            "all": stats['total_films'],
            "modifications": stats['total_modifications']
        },
        "topLanguages": [{"name": lang, "count": count} for lang, count in top_languages],
        "lastUpdated": datetime.now().strftime("%Y-%m-%d")
    }



def main():
    """Main content generation pipeline."""
    import argparse

    parser = argparse.ArgumentParser(description="Generate JSON content files for web application")
    parser.add_argument('--output-dir', default=STATIC_DIR, help='Output directory')
    parser.add_argument('--csv-file', default="src/lib/data/data.csv", help='CSV data file')

    args = parser.parse_args()

    # Use the CSV file from args
    csv_file = args.csv_file

    if not os.path.exists(csv_file):
        print(f"CSV file not found: {csv_file}")
        # Create empty files to prevent build failures
        os.makedirs(args.output_dir, exist_ok=True)
        empty_data = {
            "current_movies.json": [],
            "summary_stats.json": {"allCounts": {"all": 0, "modifications": 0}, "topLanguages": [], "lastUpdated": datetime.now().strftime("%Y-%m-%d")}
        }

        for filename, data in empty_data.items():
            filepath = os.path.join(args.output_dir, filename)
            save_json(data, filepath)
            print(f"Created empty {filename}")

        return 0

    print("Generating content files...")

    try:
        # Generate content files
        outputs = {
            "current_movies.json": generate_current_movies(csv_file),
            "summary_stats.json": generate_summary_stats(csv_file)
        }

        # Save all files
        os.makedirs(args.output_dir, exist_ok=True)
        for filename, data in outputs.items():
            filepath = os.path.join(args.output_dir, filename)
            if save_json(data, filepath):
                print(f"Generated {filepath}")
            else:
                print(f"Failed to generate {filename}")
                return 1

        print("Content generation completed successfully!")
        return 0

    except Exception as e:
        print(f"Content generation failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())