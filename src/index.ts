/* eslint-disable @typescript-eslint/consistent-type-imports */
import dotenv from 'dotenv';
import path from 'path';
import { getAPIHierarchy } from './SNClient';
import { generateFiles } from './TSGenerator';
import { SNC } from './common';
import { getAlternativeAPIHierarchy, testConnectivity } from './AlternativeParser';

// Load .env from the project root, not from dist folder
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
// Available ServiceNow releases
const madrid = 'madrid';
const newyork = 'newyork';
const orlando = 'orlando';
const paris = 'paris';
const quebec = 'quebec';
const rome = 'rome';
const sandiego = 'sandiego';
const tokyo = 'tokyo';
const utah = 'utah';
const vancouver = 'vancouver';
const washingtonDc = 'washingtondc';
const zurich = 'zurich';

// Use Zurich release (seen in the browser request)
const release = zurich;

// Check if HTML mode is enabled via environment variable
const useHTMLParser = process.env.USE_HTML_PARSER === 'true';

const configurations: SNC.HierarchyOpts[] = [
  { release, api: 'server', type: 'scoped', useHTML: useHTMLParser },
  // { release, api: 'client', type: 'all', useHTML: useHTMLParser },
  // { release, api: "server_legacy", type: "global", useHTML: useHTMLParser }
];

// Check for required environment variables
if (
  !process.env.COOKIE ||
  !process.env.USER_TOKEN ||
  process.env.COOKIE === 'your_cookie_value_here' ||
  process.env.USER_TOKEN === 'your_user_token_value_here'
) {
  console.error('\n⚠️  Missing or placeholder environment variables!\n');
  console.error(
    'Please edit the .env file and add your ServiceNow developer portal credentials:',
  );
  console.error('');
  console.error('1. Open https://developer.servicenow.com in your browser');
  console.error('2. Login with your account');
  console.error('3. Open DevTools (F12) and go to the Network tab');
  console.error('4. Navigate to any API documentation page, for example:');
  console.error(
    '   https://developer.servicenow.com/app.do#!/api_doc?v=washingtondc&type=server&id=no-namespace',
  );
  console.error('5. Find a request to "devportal.do" in the Network tab');
  console.error('6. In the Request Headers section, find and copy:');
  console.error('   - The entire Cookie header value');
  console.error('   - The X-UserToken header value');
  console.error('7. Edit the .env file and replace the placeholder values\n');
  console.error('The .env file is located at:');
  console.error(path.resolve(__dirname, '..', '.env'));
  console.error('');
  process.exit(1);
}

main();
async function main() {
  console.log(`ServiceNow TypeScript Generator - ${useHTMLParser ? 'HTML' : 'JSON'} Parser Mode`);
  console.log('==========================================');
  
  // Test connectivity first
  const isConnected = await testConnectivity();
  if (!isConnected) {
    console.error('\n⚠️  Failed to connect to ServiceNow developer portal');
    console.error('Please check your credentials and network connection.');
    // Continue anyway to try alternative approaches
  }
  
  for (const conf of configurations) {
    try {
      console.log(`\nLoading ${conf.api} using ${conf.useHTML ? 'HTML' : 'JSON'} parser...`);
      
      // Try the main parser first
      let hierarchy = await getAPIHierarchy(conf);
      
      // If no data, try alternative parser
      if (!hierarchy || Object.keys(hierarchy).length === 0) {
        console.log(`Trying alternative parser for ${conf.api}...`);
        hierarchy = await getAlternativeAPIHierarchy(conf);
      }
      
      // Validate parsed data
      if (!hierarchy || Object.keys(hierarchy).length === 0) {
        console.error(`Warning: No data parsed for ${conf.api}`);
        console.error('This could be due to:');
        console.error('1. Expired authentication credentials');
        console.error('2. Changed API structure on ServiceNow');
        console.error('3. Network connectivity issues');
        continue;
      }
      
      console.log(`Generating TypeScript definitions for ${conf.api}...`);
      await generateFiles({ ...conf, hierarchy });
      console.log(`✓ Successfully generated ${conf.api} definitions`);
    } catch (error) {
      console.error(`✗ Failed to process ${conf.api}:`, error);
      // Continue with next configuration
    }
  }
  
  console.log('\n✓ TypeScript generation complete');
}
