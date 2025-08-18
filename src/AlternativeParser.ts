/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable max-lines */
import axios, { AxiosResponse } from 'axios';
import { SNC } from './common';

/**
 * Alternative parser that tries multiple approaches to fetch ServiceNow API documentation
 * This parser attempts to work around authentication and content loading issues
 */

// Create an axios client with proper headers
function getEnhancedClient() {
  const cookie = process.env.COOKIE;
  const userToken = process.env.USER_TOKEN;
  
  return axios.create({
    headers: {
      'Cookie': cookie,
      'X-UserToken': userToken,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Referer': 'https://developer.servicenow.com/dev.do',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
    },
    baseURL: 'https://developer.servicenow.com',
    timeout: 60000,
    validateStatus: function (status) {
      return status >= 200 && status < 500; // Don't reject on 4xx errors
    },
  });
}

/**
 * Try different API endpoint patterns
 */
async function tryMultipleEndpoints(release: string, api: string): Promise<any> {
  const client = getEnhancedClient();
  const endpoints = [
    // Original endpoint
    {
      url: '/devportal.do',
      params: {
        sysparm_data: JSON.stringify({
          action: 'api.docs',
          data: {
            id: api,
            release,
          },
        }),
      },
    },
    // Alternative endpoint format 1
    {
      url: '/api/now/doc/api/reference',
      params: {
        release,
        type: api,
      },
    },
    // Alternative endpoint format 2
    {
      url: `/dev.do#!/reference/api/${release}/${api}`,
      params: {},
    },
    // REST API endpoint
    {
      url: '/api/now/table/sys_documentation',
      params: {
        sysparm_query: `name=${api}^release=${release}`,
        sysparm_limit: 1000,
      },
    },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${endpoint.url}`);
      const response = await client.get(endpoint.url, { params: endpoint.params });
      
      if (response.data) {
        // Check if we got valid data
        if (response.data.result && response.data.result.data) {
          console.log('Success with original format');
          return response.data.result.data;
        } else if (response.data.navbar || response.data.classes) {
          console.log('Success with alternative format');
          return response.data;
        } else if (Array.isArray(response.data.result)) {
          console.log('Success with REST API format');
          return { navbar: response.data.result };
        }
      }
    } catch (error) {
      console.log(`Failed with endpoint ${endpoint.url}:`, error.message);
    }
  }
  
  return null;
}

/**
 * Enhanced class fetching with retry logic
 */
async function fetchClassWithRetry(
  release: string,
  id: string,
  maxRetries: number = 3
): Promise<SNC.ClassData | null> {
  const client = getEnhancedClient();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try different parameter formats
      const params = [
        // Original format
        {
          sysparm_data: JSON.stringify({
            action: 'api.docs',
            data: { id, release },
          }),
        },
        // Alternative format 1
        {
          action: 'api.docs',
          id,
          release,
        },
        // Alternative format 2
        {
          sysparm_action: 'api.docs',
          sysparm_id: id,
          sysparm_release: release,
        },
      ];
      
      for (const param of params) {
        const response = await client.get('/devportal.do', { params: param });
        
        if (response.data && response.data.result && response.data.result.data) {
          const classData = response.data.result.data.class_data;
          if (classData) {
            return classData;
          }
        }
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff
        console.log(`Retrying class ${id} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.log(`Attempt ${attempt} failed for class ${id}:`, error.message);
    }
  }
  
  return null;
}

/**
 * Main function to get API hierarchy with enhanced error handling
 */
export async function getAlternativeAPIHierarchy(
  opts: SNC.HierarchyOpts
): Promise<SNC.SNApiHierarchy> {
  const { release, api } = opts;
  const hierarchy: SNC.SNApiHierarchy = {};
  
  try {
    console.log(`\nAttempting to fetch ${api} API documentation for ${release} release...`);
    
    // Try multiple endpoints
    const rootData = await tryMultipleEndpoints(release, api);
    
    if (!rootData) {
      console.error(`Failed to fetch root configuration for ${api}`);
      return hierarchy;
    }
    
    // Process based on the data structure we received
    if (rootData.navbar) {
      console.log('Processing navigation structure...');
      
      // Handle different navbar formats
      let navItems: any[] = [];
      
      if (Array.isArray(rootData.navbar)) {
        navItems = rootData.navbar;
      } else if (rootData.navbar.client) {
        navItems = rootData.navbar.client;
      } else if (rootData.navbar.items) {
        navItems = rootData.navbar.items;
      }
      
      console.log(`Found ${navItems.length} navigation items`);
      
      // Process navigation items
      for (const item of navItems) {
        const className = item.name || item.text || item.dc_identifier;
        const classId = item.dc_identifier || item.id || className;
        
        if (classId) {
          console.log(`Fetching class: ${className}`);
          const classData = await fetchClassWithRetry(release, classId);
          
          if (classData) {
            // Add to hierarchy (simplified for now)
            if (!hierarchy['no-namespace']) {
              hierarchy['no-namespace'] = { classes: [] };
            }
            
            // Convert to SNClass format (simplified)
            const snClass: SNC.SNClass = {
              name: classData.name,
              methods: {},
              properties: [],
              dependencies: [],
            };
            
            hierarchy['no-namespace'].classes.push(snClass);
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return hierarchy;
  } catch (error) {
    console.error('Alternative parser failed:', error);
    return hierarchy;
  }
}

/**
 * Test connectivity to ServiceNow developer portal
 */
export async function testConnectivity(): Promise<boolean> {
  const client = getEnhancedClient();
  
  try {
    console.log('Testing connectivity to ServiceNow developer portal...');
    
    // Test basic connectivity
    const response = await client.get('/');
    console.log(`Status: ${response.status}`);
    
    // Test API endpoint
    const apiResponse = await client.get('/devportal.do', {
      params: {
        sysparm_data: JSON.stringify({
          action: 'api.docs',
          data: {
            id: 'server',
            release: 'zurich',
          },
        }),
      },
    });
    
    if (apiResponse.data) {
      console.log('API endpoint is accessible');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Connectivity test failed:', error.message);
    return false;
  }
}