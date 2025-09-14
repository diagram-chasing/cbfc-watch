import { toBase64 } from '$lib/utils/core';
import type { Film } from '$lib/types';

export function generateExternalLinks(film: Film) {
	const { id, cbfcFileNo } = film;

	const getCbfcListing = (fileNo?: string) => {
		return (
			'https://www.cbfcindia.gov.in/cbfcAdmin/search-result.php?recid=' +
			(fileNo ? toBase64(fileNo) : '')
		);
	};

	const getECinepramaan = (certId: string) => {
		return 'https://archive.org/details/cbfc-ecinepramaan-' + certId;
	};

	return {
		cbfcListing: getCbfcListing(cbfcFileNo),
		eCinepramaan: getECinepramaan(id)
	};
}
