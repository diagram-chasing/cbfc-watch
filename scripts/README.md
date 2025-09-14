# Scripts

Data processing and utility scripts for CBFC Watch.

-----

## Scripts Overview

- `content_generator.py`: Generate JSON files for the website
- `data_import.py`: Pipeline for importing CBFC film data to D1 database
- `film_analysis.py`: Comparisons and analysis
- `film_utils.py`: Shared utility functions for data processing
- `search_sync.py`: Upload film data to Typesense search engine
- `generate-og-images.js`: Social media image generation

-----

## Usage

All scripts are designed to run independently:

```bash
# Generate content files
python scripts/content_generator.py

# Import data to database
python scripts/data_import.py [csv_file] --db-mode local

# Run statistical analysis
python scripts/film_analysis.py input.csv output.csv

# Sync search index
python scripts/search_sync.py data.csv https your-host your-key

# Generate OG images
node scripts/generate-og-images.js
```

-----

## Dependencies

Install Python requirements:

```bash
pip install -r scripts/requirements.txt
```