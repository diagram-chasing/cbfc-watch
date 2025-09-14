# CBFC Analysis

This folder contains the R analysis code for generating charts and statistics used on the [CBFC.WATCH](https://cbfc.watch) website.

## Running the Analysis

To regenerate the analysis and data exports:

```bash
npm run build-notebook
```

This will:

1. Run the R Markdown analysis
2. Generate HTML report in `static/notebook/`
3. Export JSON data files to `src/lib/data/charts/`

## Requirements

- R with required packages (tidyverse, lubridate, scales, etc.). See file for the full list.
