/**
 * Pre-generates Open Graph (OG) images for all films and uploads them to R2.
 *
 * HOW TO RUN:
 * 1. Make sure the dev server is running (`pnpm dev`).
 * 2. Execute the script from the project root:
 * node --max-old-space-size=8192 scripts/generate-og-images.js
 */

import {
	getUniqueModifications,
	computeTotalModifiedDuration,
	computeActionTypesData,
	countDeletions,
	countReplacements,
	getActionTypesParam
} from '../src/routes/film/film-stats.ts';

const BATCH_SIZE = 50;
const TEMP_DIR = './temp-og';

async function main() {
	try {
		console.log('🚀 Starting OG image generation...');
		const { execSync } = await import('child_process');
		const fs = await import('fs/promises');

		await fs.mkdir(TEMP_DIR, { recursive: true });

		// 1. Fetch all film slugs from the database.
		const slugsQuery = `SELECT DISTINCT slug FROM films WHERE slug IS NOT NULL`;
		console.log('Getting film slugs from D1...');
		const slugsResult = execSync(
			`wrangler d1 execute cbfc-films --local --command "${slugQuery}" --json`,
			{ encoding: 'utf8', maxBuffer: 1024 * 1024 * 50 } // 50MB buffer
		);

		const jsonMatch = slugsResult.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			throw new Error('Could not find JSON in the wrangler d1 output.');
		}
		const filmSlugs = JSON.parse(jsonMatch[0])[0].results;
		console.log(`Found ${filmSlugs.length} films to process.`);

		// 2. Generate images in batches.
		const generatedFiles = await generateImagesInBatches(filmSlugs);

		// 3. Upload the generated images to R2.
		if (generatedFiles.length > 0) {
			await uploadFilesToR2(generatedFiles);
		} else {
			console.log('No new images were generated to upload.');
		}

		console.log('\n✅ All done!');
	} catch (error) {
		console.error('❌ An error occurred in the main process:', error);
		process.exit(1);
	}
}

/**
 * Processes a list of film slugs in batches to generate images.
 * @param {Array<{slug: string}>} filmSlugs - A list of film slugs.
 * @returns {Promise<string[]>} A list of paths to the generated files.
 */
async function generateImagesInBatches(filmSlugs) {
	const generatedFiles = [];
	let skippedCount = 0;
	let errorCount = 0;

	for (let i = 0; i < filmSlugs.length; i += BATCH_SIZE) {
		const batch = filmSlugs.slice(i, i + BATCH_SIZE);
		const batchNum = i / BATCH_SIZE + 1;
		const totalBatches = Math.ceil(filmSlugs.length / BATCH_SIZE);

		console.log(`\n🔄 Processing batch ${batchNum} of ${totalBatches}...`);

		const promises = batch.map((film) => processSingleFilm(film.slug));
		const results = await Promise.allSettled(promises);

		results.forEach((result) => {
			if (result.status === 'fulfilled' && result.value) {
				if (result.value.status === 'generated') {
					generatedFiles.push(result.value.path);
				} else if (result.value.status === 'skipped') {
					skippedCount++;
				}
			} else if (result.status === 'rejected') {
				errorCount++;
			}
		});
	}

	console.log('\n✨ Generation Summary:');
	console.log(`   ✓ Generated: ${generatedFiles.length} new images`);
	console.log(`   ⏭  Skipped: ${skippedCount} (already existed)`);
	console.log(`   ✗ Errors: ${errorCount}`);

	return generatedFiles;
}

/**
 * Fetches data for a single film, generates its OG image, and saves it locally.
 * @param {string} slug - The film's slug.
 * @returns {Promise<{status: string, path?: string}>} The result of the operation.
 */
async function processSingleFilm(slug) {
	const fs = await import('fs/promises');
	const path = await import('path');
	const imagePath = path.join(TEMP_DIR, `${slug}.jpg`);

	try {
		// Skip if the image already exists.
		await fs.access(imagePath);
		return { status: 'skipped' };
	} catch {
		// Doesn't exist, so let's generate it.
	}

	try {
		const response = await fetch(`http://localhost:5173/api/films/slug/${slug}`);
		if (!response.ok) throw new Error(`API fetch failed with status ${response.status}`);
		const filmData = await response.json();

		const version = filmData.versions.find((v) => v.language === 'English') || filmData.versions[0];
		if (!version) throw new Error('No valid version found for the film');

		const mappedModifications = version.modifications.map((mod) => ({
			deletedSecs: mod.deleted_secs || 0,
			replacedSecs: mod.replaced_secs || 0,
			aiActionTypes: mod.ai_action_types,
			aiContentTypes: mod.ai_content_types
		}));

		const uniqueModifications = getUniqueModifications({ modifications: mappedModifications });
		const actionTypesData = computeActionTypesData(uniqueModifications);

		const filmPayload = {
			name: filmData.name,
			rating: filmData.rating || 'U',
			deletions: countDeletions(actionTypesData),
			replacements: countReplacements(actionTypesData),
			totalEdits: uniqueModifications.length,
			totalDuration: computeTotalModifiedDuration(uniqueModifications),
			posterUrl: filmData.poster_url || '',
			actionTypes: getActionTypesParam(actionTypesData),
			cbfcFileNo: version.cbfc_file_no || '',
			primaryContentType: version.modifications.length > 0 ? 'violence' : ''
		};

		const jpgBuffer = await generateOGImage(filmPayload);
		await fs.writeFile(imagePath, jpgBuffer);
		console.log(`   ✓ ${filmData.name}`);
		return { status: 'generated', path: imagePath };
	} catch (error) {
		console.log(`   ✗ FAILED ${slug}: ${error.message}`);
		// Re-throw to be caught by Promise.allSettled as a rejection
		throw error;
	}
}

/**
 * Uploads a list of files to R2 in batches.
 * @param {string[]} filePaths - A list of local file paths to upload.
 */
async function uploadFilesToR2(filePaths) {
	const { execSync } = await import('child_process');
	const UPLOAD_BATCH_SIZE = 10;
	let uploadedCount = 0;
	let errorCount = 0;

	console.log(`\n📦 Uploading ${filePaths.length} images to R2...`);

	for (let i = 0; i < filePaths.length; i += UPLOAD_BATCH_SIZE) {
		const batch = filePaths.slice(i, i + UPLOAD_BATCH_SIZE);
		const uploadPromises = batch.map(async (filePath) => {
			try {
				const slug = filePath.split('/').pop().replace('.jpg', '');
				const r2Path = `cbfc-watch-images/og/${slug}.jpg`;
				execSync(`wrangler r2 object put ${r2Path} --file="${filePath}" --remote`);
				uploadedCount++;
			} catch (uploadError) {
				errorCount++;
				console.error(`   ✗ Failed to upload ${filePath}:`, uploadError.message);
			}
		});
		await Promise.all(uploadPromises);
		console.log(`   ...uploaded ${uploadedCount} of ${filePaths.length}`);
	}

	console.log(`\n🎉 Upload Summary:`);
	console.log(`   ✓ Uploaded: ${uploadedCount}`);
	console.log(`   ✗ Failed: ${errorCount}`);
}

/**
 * Generates an OG image by calling a local API endpoint.
 * @param {object} filmPayload - The data needed to generate the image.
 * @returns {Promise<Buffer>} A buffer containing the generated JPG image.
 */
async function generateOGImage(filmPayload) {
	let sharpInstance;
	try {
		const params = new URLSearchParams({ pageType: 'movie', ...filmPayload });
		const response = await fetch(`http://localhost:5173/api/og?${params.toString()}`);

		if (!response.ok) {
			throw new Error(`OG endpoint failed: ${response.status} ${response.statusText}`);
		}

		const pngBuffer = await response.arrayBuffer();
		const sharp = (await import('sharp')).default;
		sharpInstance = sharp(Buffer.from(pngBuffer));

		return await sharpInstance.jpeg({ quality: 85, progressive: true }).toBuffer();
	} finally {
		// Ensure sharp's native resources are freed to prevent memory leaks.
		sharpInstance?.destroy?.();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}