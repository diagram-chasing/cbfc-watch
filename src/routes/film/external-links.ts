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
		// If certId is all digits, use the archive.org variant.
		if (/^\d+$/.test(certId)) {
			return 'https://archive.org/details/cbfc-ecinepramaan-' + certId;
		} else {
			// Otherwise, use the regular ecinepramaan.gov.in link
			return `https://www.ecinepramaan.gov.in/cbfc/?a=Certificate_Detail&i=${encodeURIComponent(certId)}`;
		}
	};

	return {
		cbfcListing: getCbfcListing(cbfcFileNo),
		eCinepramaan: getECinepramaan(id)
	};
}
