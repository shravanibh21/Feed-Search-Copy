import {createClient} from '@sanity/client';
import { groqStore } from '@sanity/groq-store';

const sanityClient = createClient({
  projectId: '1oobv90f',
  dataset: 'production',
  useCdn: false,
  apiVersion: "2024-06-11",
  //token: to  be inserted,
});



export default sanityClient;