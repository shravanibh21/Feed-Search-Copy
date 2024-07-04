import { createClient } from '@sanity/client';

export const sanClient = createClient({
  projectId: '1oobv90f',
  dataset: 'production',
  apiVersion: '2024-05-25', // Use the latest API version
  useCdn: false, // `true` if you want to use the CDN for faster responses but potentially stale data
});

export default sanClient;