import axios from "axios";

interface PoolMetadata {
  name: string;
  ticker: string;
  description: string;
  homepage: string;
  none: string;
  extended: string;
}

export async function getPoolMetadataFromURL(url: string) {
  return await axios
    .get<PoolMetadata>(url)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error(error);
      return undefined;
    });
}
