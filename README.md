# CBFC Watch

CBFC Watch is the first public, searchable database of film censorship in India. It makes censorship data for nearly 18,000 films (2017-2025) accessible for research and public awareness.

-----

## Getting Started

To get the site running on your local machine, follow these steps.

1.  **Install dependencies**:
    This project uses `pnpm` for the frontend and `pip` for Python scripts.

    ```bash
    # Install Node dependencies
    pnpm install

    # Install Python dependencies
    pip install -r scripts/requirements.txt
    ```

2.  **Configure Environment**:
    Copy the example environment file and add your own keys.

    ```bash
    cp env.example .env
    ```

3.  **Run the dev server**:

    ```bash
    pnpm dev
    ```

You can also create and preview a production build:

```bash
# Create the build
pnpm build

# Preview the site
pnpm preview
```

-----

## Tech Stack

This project is built with:

  - **Frontend**: SvelteKit, TypeScript, TailwindCSS
  - **Data Viz**: Svelteplot
  - **Search**: Typesense
  - **Database**: Cloudflare D1
  - **Deployment**: Cloudflare Pages
  - **Data Processing**: Python
  - **Analysis**: R & RMarkdown

-----

## Data Scripts

The following scripts are used to keep the project's data updated.

  - `pnpm update-data`: Fetches the latest data CSV.
  - `pnpm index-search`: Syncs the data with the Typesense search index.
  - `pnpm build-notebook`: Generates the R analysis notebook from the latest data.

-----

## Directory Structure

```
cbfc-viewer/
├── src/
│   ├── routes/
│   ├── lib/
│   │   ├── components/   # Charts and components
│   │   ├── data/         # Static data & data for charts
│   │   └── utils/
│   └── app.html
├── scripts/              # Data processing scripts (Python & Node)
├── analysis/             # R analysis files & notebooks
├── static/               # Static assets (images, fonts)
└── build/                # Production build output
```

-----

## Contributing

Contributions are welcome\! Here’s how you can help.

### Help with Data

1.  **Submit a Film**: Add missing films at [cbfc.watch/contribute](https://cbfc.watch/contribute).
2.  **Report an Error**: Find a mistake? Please report it as an issue in the [censor-board-cuts repo](https://github.com/diagram-chasing/censor-board-cuts).

### Help with Code

1.  **Bugs & Feature Requests**: Spotted a bug or have an idea? Please [open an issue](https://github.com/diagram-chasing/cbfc-watch/issues/new).
2.  **Pull Requests**: Want to contribute code? Fork the repository and [submit a pull request](https://github.com/diagram-chasing/censor-board-cuts/pulls). We'd love to see what you come up with\!

-----

## Related Projects

  - [censor-board-cuts](https://github.com/diagram-chasing/censor-board-cuts): The raw dataset that powers this project.

## License

The code is licensed under **MIT**. The data is available under **ODbL**.

## AI Declaration

 Components of this repository, including code and documentation, were written with assistance from Claude AI.