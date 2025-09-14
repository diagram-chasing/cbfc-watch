import pandas as pd
import numpy as np
import statsmodels.api as sm
import statsmodels.formula.api as smf
import sys
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s', stream=sys.stdout)

# These are the specific types of censorship modifications we will analyze.
MODIFICATION_TYPES = ["violence_modifications", "sensitive_content_modifications",
                      "political_religious_modifications", "disclaimers_added"]

# When a film has multiple genres, we use this list to pick the most representative one.
GENRE_PRIORITY = ["Horror", "Thriller", "Sci-Fi", "Action", "Crime", "Mystery",
                  "War", "Western", "Adventure", "Fantasy", "Comedy"]

def extract_primary_genre(genres_str):
    """
    Determines a film's primary genre. It prioritizes genres from the GENRE_PRIORITY
    list and falls back to the first genre if no priority genre is found.
    """
    if pd.isna(genres_str) or genres_str == "":
        return None
    for genre in GENRE_PRIORITY:
        if genre in genres_str:
            return genre
    # If no priority genre matches, just take the first one from the list (e.g., "Action|Comedy" -> "Action")
    return genres_str.split('|')[0]

def group_rare_categories(series, min_count=15, new_name='Other'):
    category_counts = series.value_counts()
    infrequent_categories = category_counts[category_counts < min_count].index
    if len(infrequent_categories) > 0:
        logging.info(f"Grouping {len(infrequent_categories)} rare categories in '{series.name}' into '{new_name}'.")
        return series.replace(infrequent_categories, new_name)
    return series

def create_movie_features(raw_df):
    """
    Cleans and transforms the raw data, aggregating it into a single summary
    row for each version of a film (e.g., the Hindi version of "Film X").
    """
    logging.info("Preparing and cleaning movie data...")
    raw_df['id'] = raw_df['id'].astype(str)

    # A "suppression" is any action that removes or alters content.
    is_suppression = raw_df['ai_action'].isin(["deletion", "audio_modification", "visual_modification",
                                              "text_modification", "content_overlay", "replacement"])
    content_type = raw_df['ai_content_types'].str

    # Tally up the different kinds of modifications for each row.
    raw_df['is_violence'] = is_suppression & content_type.contains('violence', na=False)
    raw_df['is_sensitive'] = is_suppression & content_type.contains('sexual_explicit|sexual_suggestive|profanity', na=False)
    raw_df['is_pol_rel'] = is_suppression & content_type.contains('political|religious|identity_reference', na=False)
    raw_df['is_disclaimer'] = raw_df['ai_action'] == 'insertion'
    raw_df['rating_clean'] = raw_df['rating'].str.extract(r'(U|A|UA|S)', expand=False)

    # Group all modifications by film version (ID + language) to get total counts.
    film_summaries_df = raw_df.groupby(['id', 'language'], as_index=False).agg(
        rating=('rating_clean', 'first'),
        imdb_genres=('imdb_genres', 'first'),
        violence_modifications=('is_violence', 'sum'),
        sensitive_content_modifications=('is_sensitive', 'sum'),
        political_religious_modifications=('is_pol_rel', 'sum'),
        disclaimers_added=('is_disclaimer', 'sum')
    )

    film_summaries_df['primary_genre'] = film_summaries_df['imdb_genres'].apply(extract_primary_genre)
    film_summaries_df['primary_genre'] = group_rare_categories(film_summaries_df['primary_genre'], min_count=15)
    film_summaries_df['language_grouped'] = group_rare_categories(film_summaries_df['language'], min_count=15)

    return film_summaries_df.dropna(subset=['rating', 'language_grouped'])

def model_and_analyze(film_summaries_df):
    """
    For each modification type, this calculates the expected count for a film
    compared to similar films. It tries a statistical model (Negative Binomial)
    but uses a simple median as a fallback if the model fails.
    """
    logging.info("Running statistical analysis...")
    all_results = []

    # These features define a group of "similar films" for comparison.
    comparison_group_features = ['primary_genre', 'rating', 'language_grouped']

    for modification_type in MODIFICATION_TYPES:
        model_data = film_summaries_df.copy()
        # Rename the column for the current modification type to a generic name for the model.
        model_data.rename(columns={modification_type: 'score_value'}, inplace=True)

        model = None
        formula = 'score_value ~ C(rating) + C(language_grouped)'
        # Only include genre in the model if the data is available.
        if 'primary_genre' in model_data.columns and model_data['primary_genre'].notna().any():
            formula += ' + C(primary_genre)'

        try:
            # Try to fit a Negative Binomial model
            neg_binomial_model = smf.negativebinomial(formula, data=model_data).fit(disp=True, maxiter=200)
            if neg_binomial_model.mle_retvals['converged']:
                model = neg_binomial_model
                logging.info(f"Successfully fitted a statistical model for '{modification_type}'.")
        except Exception:
            logging.warning(f"Could not fit a model for '{modification_type}'. Using a simple median fallback.")

        if model:
            # If the model worked, predict the expected score.
            model_data['median_score'] = model.predict(model_data)
            model_data['model_type'] = 'NegativeBinomial'
        else:
            model_data['median_score'] = model_data.groupby(comparison_group_features)['score_value'].transform('median')
            model_data['model_type'] = 'Empirical_Median_Fallback'

        model_data['score_type'] = modification_type
        all_results.append(model_data)

    final_df = pd.concat(all_results, ignore_index=True)

    pivot_df = final_df.pivot_table(
        index=['id', 'language', 'model_type'],
        columns='score_type',
        values=['score_value', 'median_score'],
        aggfunc='first'
    ).reset_index()

    pivot_df.columns = ['_'.join(col).strip('_') for col in pivot_df.columns]
    return pivot_df

def run_analysis(input_path, output_path):
    try:
        raw_df = pd.read_csv(input_path, dtype={'id': str})
    except FileNotFoundError:
        logging.error(f"Input file not found: {input_path}")
        sys.exit(1)

    movie_features = create_movie_features(raw_df)
    analysis_results = model_and_analyze(movie_features)

    if analysis_results.empty:
        logging.error("Analysis produced no results. Exiting.")
        sys.exit(1)

    analysis_results.to_csv(output_path, index=False)
    logging.info(f"Analysis complete. Results saved to {output_path}")

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Run the film modification analysis.")
    parser.add_argument("input_csv", help="Path to the raw input CSV file.")
    parser.add_argument("output_csv", help="Path for the output CSV file.")
    args = parser.parse_args()

    run_analysis(args.input_csv, args.output_csv)