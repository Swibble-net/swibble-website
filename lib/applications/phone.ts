// Country calling codes for the phone fields (flag + code picker left of the
// number). Pure: the forms combine code and number into one +… value, the
// server keeps validating it with normalizePhone.

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2, also used for the flag */
  code: string;
  dial: string;
  name: string;
}

/** All selectable countries, A–Z by German name (pre-sorted: same order on server and client). */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { code: "AF", dial: "93", name: "Afghanistan" },
  { code: "EG", dial: "20", name: "Ägypten" },
  { code: "AL", dial: "355", name: "Albanien" },
  { code: "DZ", dial: "213", name: "Algerien" },
  { code: "AD", dial: "376", name: "Andorra" },
  { code: "AO", dial: "244", name: "Angola" },
  { code: "AG", dial: "1268", name: "Antigua und Barbuda" },
  { code: "GQ", dial: "240", name: "Äquatorialguinea" },
  { code: "AR", dial: "54", name: "Argentinien" },
  { code: "AM", dial: "374", name: "Armenien" },
  { code: "AZ", dial: "994", name: "Aserbaidschan" },
  { code: "ET", dial: "251", name: "Äthiopien" },
  { code: "AU", dial: "61", name: "Australien" },
  { code: "BS", dial: "1242", name: "Bahamas" },
  { code: "BH", dial: "973", name: "Bahrain" },
  { code: "BD", dial: "880", name: "Bangladesch" },
  { code: "BB", dial: "1246", name: "Barbados" },
  { code: "BY", dial: "375", name: "Belarus" },
  { code: "BE", dial: "32", name: "Belgien" },
  { code: "BZ", dial: "501", name: "Belize" },
  { code: "BJ", dial: "229", name: "Benin" },
  { code: "BT", dial: "975", name: "Bhutan" },
  { code: "BO", dial: "591", name: "Bolivien" },
  { code: "BA", dial: "387", name: "Bosnien und Herzegowina" },
  { code: "BW", dial: "267", name: "Botsuana" },
  { code: "BR", dial: "55", name: "Brasilien" },
  { code: "BN", dial: "673", name: "Brunei" },
  { code: "BG", dial: "359", name: "Bulgarien" },
  { code: "BF", dial: "226", name: "Burkina Faso" },
  { code: "BI", dial: "257", name: "Burundi" },
  { code: "CL", dial: "56", name: "Chile" },
  { code: "CN", dial: "86", name: "China" },
  { code: "CR", dial: "506", name: "Costa Rica" },
  { code: "DK", dial: "45", name: "Dänemark" },
  { code: "DE", dial: "49", name: "Deutschland" },
  { code: "DO", dial: "1809", name: "Dominikanische Republik" },
  { code: "DJ", dial: "253", name: "Dschibuti" },
  { code: "EC", dial: "593", name: "Ecuador" },
  { code: "SV", dial: "503", name: "El Salvador" },
  { code: "CI", dial: "225", name: "Elfenbeinküste" },
  { code: "ER", dial: "291", name: "Eritrea" },
  { code: "EE", dial: "372", name: "Estland" },
  { code: "SZ", dial: "268", name: "Eswatini" },
  { code: "FJ", dial: "679", name: "Fidschi" },
  { code: "FI", dial: "358", name: "Finnland" },
  { code: "FR", dial: "33", name: "Frankreich" },
  { code: "GA", dial: "241", name: "Gabun" },
  { code: "GM", dial: "220", name: "Gambia" },
  { code: "GE", dial: "995", name: "Georgien" },
  { code: "GH", dial: "233", name: "Ghana" },
  { code: "GI", dial: "350", name: "Gibraltar" },
  { code: "GR", dial: "30", name: "Griechenland" },
  { code: "GB", dial: "44", name: "Großbritannien" },
  { code: "GT", dial: "502", name: "Guatemala" },
  { code: "GN", dial: "224", name: "Guinea" },
  { code: "GY", dial: "592", name: "Guyana" },
  { code: "HT", dial: "509", name: "Haiti" },
  { code: "HN", dial: "504", name: "Honduras" },
  { code: "HK", dial: "852", name: "Hongkong" },
  { code: "IN", dial: "91", name: "Indien" },
  { code: "ID", dial: "62", name: "Indonesien" },
  { code: "IQ", dial: "964", name: "Irak" },
  { code: "IR", dial: "98", name: "Iran" },
  { code: "IE", dial: "353", name: "Irland" },
  { code: "IS", dial: "354", name: "Island" },
  { code: "IL", dial: "972", name: "Israel" },
  { code: "IT", dial: "39", name: "Italien" },
  { code: "JM", dial: "1876", name: "Jamaika" },
  { code: "JP", dial: "81", name: "Japan" },
  { code: "YE", dial: "967", name: "Jemen" },
  { code: "JO", dial: "962", name: "Jordanien" },
  { code: "KH", dial: "855", name: "Kambodscha" },
  { code: "CM", dial: "237", name: "Kamerun" },
  { code: "CA", dial: "1", name: "Kanada" },
  { code: "CV", dial: "238", name: "Kap Verde" },
  { code: "KZ", dial: "7", name: "Kasachstan" },
  { code: "QA", dial: "974", name: "Katar" },
  { code: "KE", dial: "254", name: "Kenia" },
  { code: "KG", dial: "996", name: "Kirgisistan" },
  { code: "CO", dial: "57", name: "Kolumbien" },
  { code: "CG", dial: "242", name: "Kongo" },
  { code: "CD", dial: "243", name: "Kongo (Dem. Rep.)" },
  { code: "XK", dial: "383", name: "Kosovo" },
  { code: "HR", dial: "385", name: "Kroatien" },
  { code: "CU", dial: "53", name: "Kuba" },
  { code: "KW", dial: "965", name: "Kuwait" },
  { code: "LA", dial: "856", name: "Laos" },
  { code: "LS", dial: "266", name: "Lesotho" },
  { code: "LV", dial: "371", name: "Lettland" },
  { code: "LB", dial: "961", name: "Libanon" },
  { code: "LR", dial: "231", name: "Liberia" },
  { code: "LY", dial: "218", name: "Libyen" },
  { code: "LI", dial: "423", name: "Liechtenstein" },
  { code: "LT", dial: "370", name: "Litauen" },
  { code: "LU", dial: "352", name: "Luxemburg" },
  { code: "MG", dial: "261", name: "Madagaskar" },
  { code: "MW", dial: "265", name: "Malawi" },
  { code: "MY", dial: "60", name: "Malaysia" },
  { code: "MV", dial: "960", name: "Malediven" },
  { code: "ML", dial: "223", name: "Mali" },
  { code: "MT", dial: "356", name: "Malta" },
  { code: "MA", dial: "212", name: "Marokko" },
  { code: "MR", dial: "222", name: "Mauretanien" },
  { code: "MU", dial: "230", name: "Mauritius" },
  { code: "MX", dial: "52", name: "Mexiko" },
  { code: "MD", dial: "373", name: "Moldau" },
  { code: "MC", dial: "377", name: "Monaco" },
  { code: "MN", dial: "976", name: "Mongolei" },
  { code: "ME", dial: "382", name: "Montenegro" },
  { code: "MZ", dial: "258", name: "Mosambik" },
  { code: "MM", dial: "95", name: "Myanmar" },
  { code: "NA", dial: "264", name: "Namibia" },
  { code: "NP", dial: "977", name: "Nepal" },
  { code: "NZ", dial: "64", name: "Neuseeland" },
  { code: "NI", dial: "505", name: "Nicaragua" },
  { code: "NL", dial: "31", name: "Niederlande" },
  { code: "NE", dial: "227", name: "Niger" },
  { code: "NG", dial: "234", name: "Nigeria" },
  { code: "MK", dial: "389", name: "Nordmazedonien" },
  { code: "NO", dial: "47", name: "Norwegen" },
  { code: "OM", dial: "968", name: "Oman" },
  { code: "AT", dial: "43", name: "Österreich" },
  { code: "PK", dial: "92", name: "Pakistan" },
  { code: "PS", dial: "970", name: "Palästina" },
  { code: "PA", dial: "507", name: "Panama" },
  { code: "PG", dial: "675", name: "Papua-Neuguinea" },
  { code: "PY", dial: "595", name: "Paraguay" },
  { code: "PE", dial: "51", name: "Peru" },
  { code: "PH", dial: "63", name: "Philippinen" },
  { code: "PL", dial: "48", name: "Polen" },
  { code: "PT", dial: "351", name: "Portugal" },
  { code: "RW", dial: "250", name: "Ruanda" },
  { code: "RO", dial: "40", name: "Rumänien" },
  { code: "RU", dial: "7", name: "Russland" },
  { code: "ZM", dial: "260", name: "Sambia" },
  { code: "SM", dial: "378", name: "San Marino" },
  { code: "SA", dial: "966", name: "Saudi-Arabien" },
  { code: "SE", dial: "46", name: "Schweden" },
  { code: "CH", dial: "41", name: "Schweiz" },
  { code: "SN", dial: "221", name: "Senegal" },
  { code: "RS", dial: "381", name: "Serbien" },
  { code: "SC", dial: "248", name: "Seychellen" },
  { code: "SL", dial: "232", name: "Sierra Leone" },
  { code: "ZW", dial: "263", name: "Simbabwe" },
  { code: "SG", dial: "65", name: "Singapur" },
  { code: "SK", dial: "421", name: "Slowakei" },
  { code: "SI", dial: "386", name: "Slowenien" },
  { code: "SO", dial: "252", name: "Somalia" },
  { code: "ES", dial: "34", name: "Spanien" },
  { code: "LK", dial: "94", name: "Sri Lanka" },
  { code: "ZA", dial: "27", name: "Südafrika" },
  { code: "SD", dial: "249", name: "Sudan" },
  { code: "KR", dial: "82", name: "Südkorea" },
  { code: "SR", dial: "597", name: "Suriname" },
  { code: "SY", dial: "963", name: "Syrien" },
  { code: "TJ", dial: "992", name: "Tadschikistan" },
  { code: "TW", dial: "886", name: "Taiwan" },
  { code: "TZ", dial: "255", name: "Tansania" },
  { code: "TH", dial: "66", name: "Thailand" },
  { code: "TG", dial: "228", name: "Togo" },
  { code: "TT", dial: "1868", name: "Trinidad und Tobago" },
  { code: "TD", dial: "235", name: "Tschad" },
  { code: "CZ", dial: "420", name: "Tschechien" },
  { code: "TN", dial: "216", name: "Tunesien" },
  { code: "TR", dial: "90", name: "Türkei" },
  { code: "TM", dial: "993", name: "Turkmenistan" },
  { code: "UG", dial: "256", name: "Uganda" },
  { code: "UA", dial: "380", name: "Ukraine" },
  { code: "HU", dial: "36", name: "Ungarn" },
  { code: "UY", dial: "598", name: "Uruguay" },
  { code: "US", dial: "1", name: "USA" },
  { code: "UZ", dial: "998", name: "Usbekistan" },
  { code: "VE", dial: "58", name: "Venezuela" },
  { code: "AE", dial: "971", name: "Vereinigte Arabische Emirate" },
  { code: "VN", dial: "84", name: "Vietnam" },
  { code: "CF", dial: "236", name: "Zentralafrikanische Republik" },
  { code: "CY", dial: "357", name: "Zypern" },
];

export const DEFAULT_PHONE_COUNTRY = "DE";

/** Shown once more above the A–Z list. */
export const PINNED_PHONE_COUNTRIES = ["DE"] as const;

/** Flag emoji from the two regional indicator letters (🇩🇪). */
export function flagEmoji(code: string): string {
  return [...code.toUpperCase()]
    .map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65))
    .join("");
}

export function phoneCountry(code: string): PhoneCountry {
  return (
    PHONE_COUNTRIES.find((c) => c.code === code) ??
    PHONE_COUNTRIES.find((c) => c.code === DEFAULT_PHONE_COUNTRY)!
  );
}

/**
 * Number as typed + chosen country → one international number. Numbers that
 * already start with + or 00 are taken as they are; otherwise the trunk 0
 * is dropped ("0151 …" and "151 …" both become "+49151…"). "" stays "".
 */
export function combinePhone(countryCode: string, local: string): string {
  const typed = local.trim();
  if (!typed) return "";
  if (typed.startsWith("+") || typed.startsWith("00")) return typed;
  const digits = typed.replace(/\D/g, "").replace(/^0+/, "");
  return digits ? `+${phoneCountry(countryCode).dial}${digits}` : typed;
}
