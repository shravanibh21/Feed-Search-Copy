import {createClient} from '@sanity/client';
import { groqStore } from '@sanity/groq-store';

const sanityClient = createClient({
  projectId: '1oobv90f',
  dataset: 'production',
  useCdn: false,
  apiVersion: "2024-06-11",
  token: "skB3fudBGpoEODP8S6ix12OI4ox2iEi7sLZfRNvdot6Cw1QpFe6iOZseAI2NmdMJ4xY6OQw36TlT5zXqlxGt8DyXeDIyhliS55yJ6jiXFQyOiwa1PES1t46JHusA5bRJGaam9SD2sgj71bLJZdEz1r4htHEBQrX08E5yUySzQDy75nMWQfy2",
});



export default sanityClient;