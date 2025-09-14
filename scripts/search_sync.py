#!/usr/bin/env python3
"""
Search Sync - Upload film data to Typesense search engine
Streamlined search indexing with comprehensive field mapping
"""

import sys
import os
import json
import requests

# Add scripts directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from film_utils import *

def create_search_schema():
    """Define Typesense schema for film search."""
    return {
        'name': 'films',
        'fields': [
            # Basic film info
            {'name': 'id', 'type': 'string'},
            {'name': 'slug', 'type': 'string'},
            {'name': 'name', 'type': 'string', 'facet': True},
            {'name': 'year', 'type': 'int32', 'facet': True},
            {'name': 'language', 'type': 'string[]', 'facet': True},
            {'name': 'rating', 'type': 'string', 'facet': True},
            {'name': 'duration_mins', 'type': 'float'},

            # IMDB data
            {'name': 'imdb_id', 'type': 'string'},
            {'name': 'imdb_rating', 'type': 'float', 'facet': True},
            {'name': 'imdb_votes', 'type': 'int32', 'facet': True},
            {'name': 'imdb_overview', 'type': 'string'},
            {'name': 'imdb_genres', 'type': 'string[]', 'facet': True},
            {'name': 'imdb_directors', 'type': 'string[]', 'facet': True},
            {'name': 'imdb_actors', 'type': 'string[]', 'facet': True},
            {'name': 'imdb_countries', 'type': 'string[]', 'facet': True},
            {'name': 'imdb_release_date', 'type': 'int64', 'facet': True},
            {'name': 'poster_url', 'type': 'string', 'index': False},

            # Censorship data
            {'name': 'modification_count', 'type': 'int32', 'facet': True},
            {'name': 'modification_descriptions', 'type': 'string'},
            {'name': 'ai_cleaned_descriptions', 'type': 'string'},

            # AI tags
            {'name': 'ai_actions', 'type': 'string[]', 'facet': True},
            {'name': 'ai_content_types', 'type': 'string[]', 'facet': True},
            {'name': 'ai_media_elements', 'type': 'string[]', 'facet': True},

            # Search and analytics
            {'name': 'searchable_content', 'type': 'string'},
            {'name': 'popularity_score', 'type': 'float', 'facet': True},
            {'name': 'click_count', 'type': 'int32', 'facet': True, 'optional': True},
            {'name': 'has_poster', 'type': 'bool', 'facet': True},
            {'name': 'cert_date_timestamp', 'type': 'int64', 'facet': True},

            # Embeddings
            {'name': 'embeddings', 'type': 'float[]', 'embed': {'from': ['ai_cleaned_descriptions'], 'model_config': {'model_name': 'openai/gemini-embedding-001', 'api_key': os.environ.get('GEMINI_API_KEY'), 'url': 'https://generativelanguage.googleapis.com', 'path': '/v1beta/openai/embeddings'}}}
        ],
        'default_sorting_field': 'popularity_score'
    }

def recalculate_proportional_popularity(documents):
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
    def classify_language(languages):
        if not languages:
            return 'other'
        
        # Take the first language
        primary_lang = languages[0].lower().rstrip()
        
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
    
    # Group documents by language category and sort by original popularity
    language_groups = {}
    for doc in documents:
        lang_category = classify_language(doc['imdb_languages'])
        if lang_category not in language_groups:
            language_groups[lang_category] = []
        language_groups[lang_category].append(doc)
    
    # Sort each language group by original popularity (descending)
    for lang_category in language_groups:
        language_groups[lang_category].sort(key=lambda x: x['popularity_score'], reverse=True)
    
    # Recalculate popularity scores with proportional representation
    total_films = len(documents)
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
                    doc = language_groups[lang].pop(0)
                    doc['popularity_score'] = current_popularity
                    current_popularity -= 1
                    processed_count += 1
            
    return documents

def prepare_search_documents(csv_file):
    """Transform CSV data into Typesense documents."""
    groups, _ = load_and_group_films(csv_file)
    if not groups:
        return []

    documents = []
    used_slugs = set()

    print(f"Processing {len(groups)} unique films for search...")

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

        # Collect data from all film versions
        languages = set()
        mod_descriptions = []
        ai_cleaned_descriptions = []
        ai_actions = set()
        ai_content_types = set()
        ai_media_elements = set()

        for row in film_rows:
            if row.get('language'):
                languages.add(row['language'].strip())
            if row.get('description'):
                mod_descriptions.append(row['description'])
            if row.get('ai_cleaned_description'):
                ai_cleaned_descriptions.append(row['ai_cleaned_description'])
            if row.get('ai_action'):
                ai_actions.update(split_delimited_values(row['ai_action']))
            if row.get('ai_content_types'):
                ai_content_types.update(split_delimited_values(row['ai_content_types']))
            if row.get('ai_media_element'):
                ai_media_elements.update(split_delimited_values(row['ai_media_element']))

        # Build comprehensive searchable content
        searchable_parts = [
            clean_name(best_row.get('movie_name', '')),
            ' '.join(languages),
            best_row.get('imdb_overview', ''),
            ' '.join(mod_descriptions),
            ' '.join(ai_cleaned_descriptions),
            ' '.join(split_delimited_values(best_row.get('imdb_genres', ''))),
            ' '.join(split_delimited_values(best_row.get('imdb_directors', ''))),
            ' '.join(split_delimited_values(best_row.get('imdb_actors', ''))[:10])  # Limit actors
        ]

        # Calculate popularity for sorting order
        popularity = calculate_popularity_score(
            imdb_votes=safe_int(best_row.get('imdb_votes', 0)),
            imdb_rating=best_row.get('imdb_rating')
        )

        doc = {
            'id': best_row.get('id', slug),
            'slug': slug,
            'name': clean_name(best_row.get('movie_name', '')),
            'year': safe_int(year),
            'language': sorted(list(languages)) if languages else [best_row.get('language', '')],
            'rating': best_row.get('rating', ''),
            'duration_mins': safe_float(best_row.get('duration_secs', 0)) / 60.0,

            # IMDB data
            'imdb_id': best_row.get('imdb_id', ''),
            'imdb_rating': safe_float(best_row.get('imdb_rating')),
            'imdb_votes': safe_int(best_row.get('imdb_votes', 0)),
            'imdb_overview': best_row.get('imdb_overview', ''),
            'imdb_genres': split_delimited_values(best_row.get('imdb_genres', '')),
            'imdb_directors': split_delimited_values(best_row.get('imdb_directors', '')),
            'imdb_actors': split_delimited_values(best_row.get('imdb_actors', ''))[:15],
            'imdb_countries': split_delimited_values(best_row.get('imdb_countries', '')),
            'imdb_release_date': parse_date_to_timestamp(best_row.get('imdb_release_date')),
            'imdb_languages': split_delimited_values(best_row.get('imdb_languages', '')),
            'poster_url': best_row.get('imdb_poster_url', ''),

            # Censorship data
            'modification_count': len(mod_descriptions),
            'modification_descriptions': ' '.join(mod_descriptions),
            'ai_cleaned_descriptions': ' '.join(ai_cleaned_descriptions),

            # AI tags
            'ai_actions': sorted(list(ai_actions)),
            'ai_content_types': sorted(list(ai_content_types)),
            'ai_media_elements': sorted(list(ai_media_elements)),

            # Search fields
            'searchable_content': ' '.join([p for p in searchable_parts if p]).strip(),
            'popularity_score': popularity,
            'click_count': 0,
            'has_poster': bool(best_row.get('imdb_poster_url', '').strip()),
            'cert_date_timestamp': parse_date_to_timestamp(best_row.get('cert_date'))
        }

        documents.append(doc)

    # Recalculate popularity scores for proportional language representation
    print("Recalculating popularity scores for proportional language representation...")
    documents = recalculate_proportional_popularity(documents)
    
    return documents

def sync_to_typesense(documents, protocol, host, api_key):
    """Upload documents to Typesense."""
    headers = {'X-TYPESENSE-API-KEY': api_key, 'Content-Type': 'application/json'}
    base_url = f"{protocol}://{host}"

    # Delete existing collection
    requests.delete(f"{base_url}/collections/films", headers=headers)

    # Create new collection
    schema = create_search_schema()
    response = requests.post(f"{base_url}/collections", json=schema, headers=headers)

    if response.status_code != 201:
        print(f"Failed to create collection: {response.status_code} - {response.text}")
        return False

    print(f"Collection created successfully")

    batch_size = 20
    total_uploaded = 0

    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        data = '\n'.join(json.dumps(doc, ensure_ascii=False) for doc in batch)

        response = requests.post(
            f"{base_url}/collections/films/documents/import",
            data=data.encode('utf-8'),
            headers={'X-TYPESENSE-API-KEY': api_key, 'Content-Type': 'text/plain'}
        )

        if response.status_code == 200:
            total_uploaded += len(batch)
            print(f"✅ Uploaded batch {min(i + batch_size, len(documents))}/{len(documents)}")
        else:
            print(f"❌ Batch {i//batch_size + 1} failed: {response.status_code} - {response.text}")
            return False

    print(f"🎉 Successfully uploaded {total_uploaded} films to Typesense")

    # Test search functionality
    test_queries = [
        {'q': 'name:gan*', 'query_by': 'name,searchable_content'},
        {'q': 'imdb_rating:>7', 'query_by': 'name,searchable_content'},
        {'q': 'modification_count:>5', 'query_by': 'name,searchable_content'}
    ]

    for i, query in enumerate(test_queries, 1):
        response = requests.get(
            f"{base_url}/collections/films/documents/search",
            params=query, headers=headers
        )
        if response.status_code == 200:
            results = response.json()
            print(f"🔍 Test query {i} found {results['found']} results")
        else:
            print(f"⚠️ Test query {i} failed: {response.status_code}")

    return True

def main():
    """Main search sync pipeline."""
    import argparse

    parser = argparse.ArgumentParser(description="Sync film data to Typesense search engine")
    parser.add_argument('csv_file', help='CSV file with film data')
    parser.add_argument('protocol', help='Protocol (http/https)')
    parser.add_argument('host', help='Typesense host')
    parser.add_argument('api_key', help='Typesense API key')

    args = parser.parse_args()

    # Validate required arguments
    if not args.protocol:
        print("Error: TYPESENSE_PROTOCOL environment variable not set")
        sys.exit(1)
    if not args.host:
        print("Error: TYPESENSE_HOST environment variable not set")
        sys.exit(1)
    if not args.api_key:
        print("Error: TYPESENSE_API_KEY environment variable not set")
        sys.exit(1)

    if not os.path.exists(args.csv_file):
        print(f"CSV file not found: {args.csv_file}")
        sys.exit(1)

    print("Preparing search documents...")
    documents = prepare_search_documents(args.csv_file)


    if not documents:
        print("No documents to upload")
        sys.exit(1)

    print(f"Syncing {len(documents)} documents to Typesense...")
    success = sync_to_typesense(documents, args.protocol, args.host, args.api_key)

    if success:
        print("Search sync completed successfully!")
        sys.exit(0)
    else:
        print("Search sync failed!")
        sys.exit(1)

if __name__ == '__main__':
    main()
